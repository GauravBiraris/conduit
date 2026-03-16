import sys
import json
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.types import JSON

def evaluate_logic(logic, row):
    if not isinstance(logic, dict):
        return logic
        
    op = list(logic.keys())[0]
    params = logic[op]
    
    if not isinstance(params, list):
        params = [params]
        
    if op == "var":
        val = row.get(params[0])
        return None if pd.isna(val) else val
        
    elif op == "parse_date":
        val = evaluate_logic(params[0], row)
        fmt_str = params[1] if len(params) > 1 else ""
        
        if pd.isna(val) or val is None or str(val).strip() == "":
            return None
            
        val_str = str(val).strip()
        
        # Translate UI formats to Python strftime formats
        py_fmt = None
        if fmt_str == "MM/DD/YYYY": py_fmt = "%m/%d/%Y"
        elif fmt_str == "DD/MM/YYYY": py_fmt = "%d/%m/%Y"
        elif fmt_str == "YYYY-MM-DD": py_fmt = "%Y-%m-%d"
        
        try:
            if py_fmt:
                dt = pd.to_datetime(val_str, format=py_fmt)
            else:
                dt = pd.to_datetime(val_str)
            return dt.strftime('%Y-%m-%dT00:00:00')
        except:
            # Fallback if pandas completely fails
            if "T" not in val_str:
                return val_str + "T00:00:00"
            return val_str
            
    elif op == "/":
        val = evaluate_logic(params[0], row)
        return float(val) / float(params[1]) if pd.notna(val) else None
        
    elif op == "*":
        val = evaluate_logic(params[0], row)
        return float(val) * float(params[1]) if pd.notna(val) else None
        
    elif op == "==":
        val = evaluate_logic(params[0], row)
        return str(val) == str(params[1])
        
    elif op == "if":
        for i in range(0, len(params) - 1, 2):
            if evaluate_logic(params[i], row):
                return evaluate_logic(params[i+1], row)
        if len(params) % 2 != 0:
            return evaluate_logic(params[-1], row)
        return None
        
    else:
        raise ValueError(f"Unsupported Logic Operator: {op}")


def run_etl(recipe_path, config_str):
    with open(recipe_path, 'r') as f:
        recipe = json.load(f)
        
    config = json.loads(config_str)
    source_type = config.get("sourceType", "csv")
    data_path = config.get("dataPath", "")
    out_pref = config.get("outputPreference", "json")
    
    source_db = config.get("sourceDbConfig", {}) 
    target_db = config.get("targetDbConfig", {}) 

    if source_type == "csv":
        df = pd.read_csv(data_path)
    else:
        uri = f"{source_db.get('dialect', 'postgresql')}://{source_db.get('user', '')}:{source_db.get('pass', '')}@{source_db.get('host', 'localhost')}:{source_db.get('port', '5432')}/{source_db.get('dbname', '')}"
        engine = create_engine(uri)
        query = source_db.get('query', '')
        sql = f"SELECT * FROM {query}" if " " not in query.strip() else query
        df = pd.read_sql(sql, engine)

    actus_contracts = []
    
    for index, row in df.iterrows():
        row_dict = row.to_dict()
        contract = { "contractType": recipe.get("actus_target") }
        
        for mapping in recipe.get("mappings", []):
            actus_attr = mapping.get("actus_attr")
            logic = mapping.get("json_logic")
            
            if logic is None:
                continue
                
            try:
                result = evaluate_logic(logic, row_dict)
                if result is not None and result != "":
                    
                    # AUTO-SANITIZATION: Ensure dates are strict ISO even if UI mapping was missed
                    if "Date" in actus_attr and isinstance(result, str) and "T" not in result:
                        try:
                            result = pd.to_datetime(result.strip()).strftime('%Y-%m-%dT00:00:00')
                        except:
                            pass
                            
                    contract[actus_attr] = result
            except Exception as e:
                contract[actus_attr] = f"ERROR: {str(e)}"
                
        actus_contracts.append(contract)

    if out_pref == "db":
        out_records = [{"contract_id": str(c.get("contractID", f"GEN-{i}")), "contract_type": c.get("contractType", "UNKNOWN"), "payload": c} for i, c in enumerate(actus_contracts)]
        out_df = pd.DataFrame(out_records)
        out_uri = f"{target_db.get('dialect', 'postgresql')}://{target_db.get('user', '')}:{target_db.get('pass', '')}@{target_db.get('host', 'localhost')}:{target_db.get('port', '5432')}/{target_db.get('dbname', '')}"
        
        out_engine = create_engine(out_uri)
        out_df.to_sql('actus_contracts', out_engine, if_exists='append', index=False, dtype={'payload': JSON})
        
        print(f"SUCCESS: Transformed {len(actus_contracts)} contracts into target DB.")
    else:
        output_payload = { "contracts": actus_contracts, "riskFactors": [] }
        output_path = data_path.replace('.csv', '_ACTUS.json') if data_path else "output_ACTUS.json"
        with open(output_path, 'w') as f:
            json.dump(output_payload, f, indent=2)
            
        print(f"SUCCESS: Transformed {len(actus_contracts)} contracts.")
        print(f"Saved JSON File to: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Error: Missing arguments.")
        sys.exit(1)
    run_etl(sys.argv[1], sys.argv[2])
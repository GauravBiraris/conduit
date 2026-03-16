import sys
import json
import pandas as pd
from sqlalchemy import create_engine

def simulate(config_str):
    config = json.loads(config_str)
    out_pref = config.get("outputPreference", "json")
    target_db = config.get("targetDbConfig", {})
    data_path = config.get("dataPath", "")

    contracts = []
    
    # 1. Load Transformed Contracts
    if out_pref == 'json':
        json_path = data_path.replace('.csv', '_ACTUS.json') if data_path else "output_ACTUS.json"
        try:
            with open(json_path, 'r') as f:
                payload = json.load(f)
                contracts = payload.get("contracts", [])
        except FileNotFoundError:
            print("ERROR: Could not find _ACTUS.json. Please run the Transformation ETL first.")
            sys.exit(1)
    else:
        uri = f"{target_db.get('dialect', 'postgresql')}://{target_db.get('user', '')}:{target_db.get('pass', '')}@{target_db.get('host', 'localhost')}:{target_db.get('port', '5432')}/{target_db.get('dbname', '')}"
        engine = create_engine(uri)
        df = pd.read_sql("SELECT payload FROM actus_contracts", engine)
        contracts = df['payload'].tolist()

    if not contracts:
        print("ERROR: No contracts found to simulate.")
        sys.exit(1)

    # 1.5 SANITIZE PAYLOAD
    clean_contracts = []
    for c in contracts:
        clean_c = {}
        for k, v in c.items():
            if v is None or v == "" or (isinstance(v, str) and v.startswith("ERROR:")): continue
            if "Date" in k and isinstance(v, str):
                v_str = v.strip()
                if "T" not in v_str:
                    try: v = pd.to_datetime(v_str).strftime('%Y-%m-%dT00:00:00')
                    except: pass
            clean_c[k] = v
        clean_contracts.append(clean_c)

    # =================================================================
    # 2. LOCAL PYTHON SIMULATOR (PAM, LAM, ANN)
    # =================================================================
    results = {}
    
    for c in clean_contracts:
        cid = c.get("contractID", "UNKNOWN")
        ctype = c.get("contractType", "PAM")
        events = []
        
        # RPA = Bank is Lender (Outflow first, Inflow later). RPL = Borrower
        role_sign = -1 if c.get("contractRole") == "RPA" else 1
        
        prin = float(c.get("notionalPrincipal", 0))
        rate = float(c.get("nominalInterestRate", 0))
        ied_str = c.get("initialExchangeDate")
        md_str = c.get("maturityDate")
        cycle = c.get("cycleOfInterestPayment", "P1YL0")
        
        # Skip if missing critical dates
        if not (ied_str and md_str):
            results[cid] = []
            continue
            
        try:
            ied = pd.to_datetime(ied_str[:10])
            md = pd.to_datetime(md_str[:10])
        except:
            results[cid] = []
            continue

        # Event: Initial Disbursement
        events.append({"type": "IED", "time": ied.strftime('%Y-%m-%dT00:00:00'), "payoff": prin * role_sign})
        
        # Calculate Schedule Frequency
        is_monthly = "1M" in cycle
        periods_per_year = 12 if is_monthly else 1
        
        # Generate Payment Schedule Dates
        pay_dates = []
        curr_date = ied
        while curr_date < md:
            if is_monthly:
                curr_date = curr_date + pd.DateOffset(months=1)
            else:
                curr_date = curr_date + pd.DateOffset(years=1)
            
            if curr_date > md: curr_date = md # Cap at exact maturity date
            pay_dates.append(curr_date)
            
        N = len(pay_dates)
        if N == 0:
            N = 1
            pay_dates = [md]

        balance = prin
        periodic_rate = rate / periods_per_year

        # --- APPLY CONTRACT SPECIFIC MATHEMATICS ---
        if ctype == "PAM":
            # PAM: Periodic Interest, Principal all at the end
            for i, d in enumerate(pay_dates):
                date_str = d.strftime('%Y-%m-%dT00:00:00')
                interest = balance * periodic_rate
                events.append({"type": "IP", "time": date_str, "payoff": interest * -role_sign})
                
                if i == N - 1: # Last period
                    events.append({"type": "MD", "time": date_str, "payoff": balance * -role_sign})

        elif ctype == "LAM":
            # LAM: Equal Principal installments, declining interest
            prin_installment = prin / N
            for i, d in enumerate(pay_dates):
                date_str = d.strftime('%Y-%m-%dT00:00:00')
                interest = balance * periodic_rate
                events.append({"type": "IP", "time": date_str, "payoff": interest * -role_sign})
                
                actual_prin = min(prin_installment, balance)
                events.append({"type": "PRD", "time": date_str, "payoff": actual_prin * -role_sign})
                balance -= actual_prin

        elif ctype == "ANN":
            # ANN: Equal Total EMI (Principal portion increases over time)
            if periodic_rate > 0:
                emi = prin * (periodic_rate * (1 + periodic_rate)**N) / ((1 + periodic_rate)**N - 1)
            else:
                emi = prin / N
                
            for i, d in enumerate(pay_dates):
                date_str = d.strftime('%Y-%m-%dT00:00:00')
                interest = balance * periodic_rate
                events.append({"type": "IP", "time": date_str, "payoff": interest * -role_sign})
                
                prin_payment = emi - interest
                if i == N - 1: prin_payment = balance # Clean up rounding errors on final payment
                
                events.append({"type": "PRD", "time": date_str, "payoff": prin_payment * -role_sign})
                balance -= prin_payment

        results[cid] = events
    # =================================================================

    # 3. Process Events & Aggregate for React Dashboard
    all_events = []
    chart_data = {} 

    for cid, events in results.items():
        for ev in events:
            etype = ev.get("type")
            time = ev.get("time", "")[:10]
            val = float(ev.get("payoff", 0))
            
            all_events.append({"contract_id": cid, "event_type": etype, "event_date": time, "amount": val})
            
            if time and val != 0:
                ym = time[:7]
                if ym not in chart_data:
                    chart_data[ym] = {"date": ym, "principal": 0, "interest": 0, "balance": 0}
                
                if etype in ['PRD', 'IED', 'MD']: 
                    chart_data[ym]["principal"] += val
                elif etype in ['IP', 'IPCI']: 
                    chart_data[ym]["interest"] += val

    # 4. Save Raw Granular Output
    if out_pref == 'json':
        cf_path = data_path.replace('.csv', '_CASHFLOWS.json') if data_path else "output_CASHFLOWS.json"
        with open(cf_path, 'w') as f:
            json.dump(all_events, f, indent=2)
        print(f"SUCCESS: Saved {len(all_events)} granular cashflow events to {cf_path}")
    else:
        cf_df = pd.DataFrame(all_events)
        cf_df.to_sql('actus_cashflows', engine, if_exists='replace', index=False)
        print(f"SUCCESS: Saved {len(all_events)} cashflow events to PostgreSQL table 'actus_cashflows'")

    # 5. Pass formatted Chart Data to Electron via Magic String
    sorted_chart_data = sorted(list(chart_data.values()), key=lambda x: x["date"])
    print("___CHART_DATA___" + json.dumps(sorted_chart_data))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        simulate(sys.argv[1])
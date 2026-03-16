import sys
import json
import pandas as pd
from sqlalchemy import create_engine

def profile_db(config_json):
    try:
        config = json.loads(config_json)
        dialect = config.get('dialect', 'postgresql')
        user = config.get('user', '')
        password = config.get('pass', '')
        host = config.get('host', 'localhost')
        port = config.get('port', '5432')
        dbname = config.get('dbname', '')
        query = config.get('query', '')

        # Build the SQLAlchemy connection string
        uri = f"{dialect}://{user}:{password}@{host}:{port}/{dbname}"
        engine = create_engine(uri)

        # If it's a single word, assume it's a table name. Otherwise treat as raw SQL.
        sql = f"SELECT * FROM {query} LIMIT 5" if " " not in query.strip() else query

        # Stream the first 5 rows
        df_iter = pd.read_sql(sql, engine, chunksize=5)
        df = next(df_iter)

        # Convert everything to string for safe JSON serialization back to Node.js
        df_str = df.astype(str)

        result = {
            "success": True,
            "headers": df.columns.tolist(),
            "rows": df_str.values.tolist()
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        profile_db(sys.argv[1])
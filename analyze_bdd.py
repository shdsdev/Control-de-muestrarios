import pandas as pd

file_path = "BDD fabricacion de muestrarios.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    print("Sheet names:", xl.sheet_names)
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        print(f"\n--- Sheet: {sheet} ---")
        print(df.head())
except Exception as e:
    print(f"Error reading Excel: {e}")

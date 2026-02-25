import csv

file_path = "BDD fabricacion de muestrarios.csv"

empresas = set()
tipos_producto = set()
regiones = set()

with open(file_path, mode='r', encoding='latin-1') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['empresa']: empresas.add(row['empresa'])
        if row['tipo_producto']: tipos_producto.add(row['tipo_producto'])
        # if row['region']: regiones.add(row['region']) # Need to check if 'region' exists in later lines or if I should use a default
        
print("--- Empresas (Unique IDs/Names) ---")
print(sorted(list(empresas)))
print("\n--- Tipos de Producto ---")
print(sorted(list(tipos_producto)))

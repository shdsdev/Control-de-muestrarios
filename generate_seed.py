import csv
from datetime import datetime

file_path = "BDD fabricacion de muestrarios.csv"
sql_file = "seed_data.sql"

empresas = set()
tipos_producto = set()

# Map CSV status to DB enum
status_map = {
    'Fabricación': 'EN_PRODUCCION',
    'Espera de Cliente': 'BORRADOR',
    'Diseño de Propuesta': 'BORRADOR',
    'Pendiente': 'ENVIADA',
    'Terminado': 'CERRADA',
    'Entregado': 'ENTREGADA',
    'Cancelado': 'CANCELADA',
    'Rechazado': 'RECHAZADA'
}

def clean_date(date_str):
    if not date_str: return None
    try:
        # 14/08/2024 9:45:16
        dt = datetime.strptime(date_str, '%d/%m/%Y %H:%M:%S')
        return dt.isoformat()
    except:
        return None

with open(file_path, mode='r', encoding='latin-1') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    for row in rows:
        if row['empresa']: empresas.add(row['empresa'])
        if row['tipo_producto']: tipos_producto.add(row['tipo_producto'])

with open(sql_file, 'w', encoding='utf-8') as f:
    f.write("-- SEED DATA\n\n")
    
    # 1. Regiones
    f.write("INSERT INTO regiones (nombre) VALUES ('Norte'), ('Centro'), ('Sur') ON CONFLICT (nombre) DO NOTHING;\n")
    f.write("DO $$\nDECLARE north_id UUID; BEGIN SELECT id INTO north_id FROM regiones WHERE nombre = 'Norte';\n")
    
    # 2. Empresas
    f.write("-- Empresas\n")
    for emp in sorted(list(empresas)):
        f.write(f"INSERT INTO empresas (nombre, codigo_cliente, region_id) SELECT '{emp}', '{emp}', north_id ON CONFLICT (codigo_cliente) DO NOTHING;\n")
    
    # 3. Tipos
    f.write("\n-- Tipos de Muestrario\n")
    for tipo in sorted(list(tipos_producto)):
        f.write(f"INSERT INTO muestrarios_tipos (nombre, sla_dias_estandar) VALUES ('{tipo}', 5) ON CONFLICT DO NOTHING;\n")
    
    f.write("END $$;\n")

print(f"SQL seed script generated: {sql_file}")

import pandas as pd

# Nolasa CSV failu
df = pd.read_csv('data.csv')

# Inicializē jaunu DataFrame, lai saglabātu derīgos datus
all_data = pd.DataFrame()

# Loop caur katru unikālo tracker_id
for tracker_id in df['tracker_id'].unique():
    df_filtered = df[df['tracker_id'] == tracker_id].copy()

    current_lap = 0
    previous_s = df_filtered.iloc[0]['s']  # Sākotnējā s vērtība

    lap_assignment = []  # Saraksts, lai saglabātu derīgus apļu numurus

    for i in range(1, len(df_filtered)):
        current_s = df_filtered.iloc[i]['s']

        # Pārbauda, vai ir jauns aplis, balstoties uz 's' vērtības pāreju pāri robežai
        if previous_s > 245 and current_s < 5:
            current_lap += 1

        lap_assignment.append(current_lap)
        previous_s = current_s

    # Pievieno apļa numurus filtrētajam DataFrame
    df_filtered = df_filtered.iloc[1:].copy()  # Izlaiž pirmo rindu, jo tai nav piešķirts aplis
    df_filtered['lap'] = lap_assignment

    # Pievieno derīgos datus kopējam DataFrame
    all_data = pd.concat([all_data, df_filtered])

# Saglabā datus JS failā
data = all_data[['tracker_id', 'x', 'y', 'lap', 'real_speed', 's', 'd', 'time']].to_dict(orient='records')
with open('data.js', 'w') as f:
    f.write(f'const scatterData = {data};')

print("Dati ir ierakstīti failā 'data.js'")

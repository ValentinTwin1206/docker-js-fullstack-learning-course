# 1. Influx

1. Influx DB Container im ``docker-compose.yaml``

2. InfluxDB Client (``@influxdata/influxdb-client``) für JavaScript in ``package.json``

3. Development der ``backend/config/influx.js``

  3.1 Erste Methode ``writeApiRequest`` schreibt an Influx Informationen über die API Nutzung

  3.2 Zweite Methode ``writeUserGrowth`` schreibt an Influx Informationen über User-Wachstum Statistiken

4. Anbindung beider Methoden an die ``statistics.middleware.js`` Funktion

5. Start des Devcontainers

6. Öffne ``Docker Desktop`` und klicke auf den FancyFileServer Backend Container

7. Erstelle einen kleinen Request gegen das Backend 
```json
# POST /api/v1/users
{
  "firstname": "Max",
  "lastname": "Musterman",
  "email": "max.mustermann4@example.com",
  "password": "Test1234!"
}
```

8. Schicke den Request ab und beobachte den Log im Backend Container -> man sieht den InfluxDB Log-Eintrag -> App schreibt erfolgreich nach InfluxDB

9. Öffne die InfluxDB UI und überprüfe dort den geschriebenen Datenbank-Eintrag

10. Wiederhole die Schritte gegebenfalls nochmal 

# 2. Grafana

1. Definiere den Grafana Container im ``docker-compose`` File

2. Erstelle die notwendigen Umgebungsvariablen

3. Starte das Compose Setup mit Grafana

4. Öffne die Grafana UI und binde dort Influx DB an

  4.1 Add new connection -> InfluxDB auswählen

## 2.1 Erstellung einer User-Growth Grafik

1. Neues Panel anlegen
Dashboard → Add → Visualization → Datasource: InfluxDB

2. Query eingeben
Im Query-Editor auf Code umschalten und folgende Query einfügen:

```text
from(bucket: "api_metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "user_growth" and r._field == "count")
  |> map(fn: (r) => ({ r with _value: if r.event == "deletion" then -r._value else r._value }))
  |> cumulativeSum()
  |> yield(name: "total_users")
```

3. Panel konfigurieren (rechte Seite)

Einstellung	Wert
Visualization	Time series
Title	User Growth
Unit	short
Min	0
Fill opacity	20
Line interpolation	Step after
Show points	Always

4. Zeitbereich anpassen
Da cumulativeSum() den gesamten Verlauf zeigen soll, oben rechts in Grafana:

Zeitbereich auf z.B. Last 7 days oder Last 30 days stellen
Auto-Refresh auf 30s

5. Oben rechts im Dashboard:

Auf den Zeitbereich klicken → Last 1 hour oder Last 24 hours wählen
Dann 🔄 Refresh klicken

6. Starte den ``Smoke`` Test um die Datenübertragung zu überprüfen

## 2.2 Visualisierung der API Nutzung vom Fancy FileServer

### Top aufgerufene Endpunkte als BarChart

```text
from(bucket: "api_metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "api_requests")
  |> filter(fn: (r) => r["_field"] == "count")
  |> group(columns: ["path", "method"])
  |> sum()
  |> map(fn: (r) => ({ _value: r._value, _field: r.method + " " + r.path }))
  |> group()
  |> sort(columns: ["_value"], desc: true)
  |> limit(n: 10)+
```

Panel-Einstellungen:

- Visualization: Bar chart
- Title: Top 10 Endpoints
- X-axis: _field

### Zeitliche Nutzung/Aufruf des Backends

```text
from(bucket: "api_metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "api_requests")
  |> filter(fn: (r) => r["_field"] == "count")
  |> aggregateWindow(every: v.windowPeriod, fn: sum, createEmpty: false)
  |> group(columns: ["path", "method"])
```

Panel-Einstellungen (rechte Seite):

- Visualization: Time series
- Title: API Requests by Endpoint
- Under Standard options:
- Unit: short
- Display name: ${__series.name} (zeigt path + method)
- Under Legend: Mode Table, Placement Bottom, Values: Sum
→ Jede Linie = ein Endpunkt


## 2.3 Definition eines automatischen Grafana Provisioners
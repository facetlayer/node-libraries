# Complex Nested Queries
# Demonstrates advanced syntax with nested query structures

# Database query with filtering
get users where(active=true role="admin")

# Complex filtering with multiple conditions
find products where(
    category="electronics"
    price-range(min=100 max=500)
    in-stock=true
)

# Nested configuration sections
server-config(
    listen(port=8080 host="0.0.0.0")
    ssl(enabled=true cert-file="/path/to/cert.pem")
    routes(
        api(path="/api" version="v1")
        static(path="/static" directory="public")
        health(path="/health" enabled=true)
    )
)

# Permission system with nested rules
permissions user-role="manager"(
    read(tables="users,products,orders")
    write(tables="products,orders")
    admin(level="department")
)

# Build configuration with nested steps
build-pipeline(
    test(
        unit-tests(framework=jest timeout=30)
        integration-tests(browser=chrome headless=true)
    )
    compile(
        typescript(target=es2020 strict=true)
        scss(output-style=compressed)
    )
    deploy(
        environment=staging
        notifications(
            slack(channel="#deploys")
            email(recipients="team@example.com")
        )
    )
)

# Data transformation pipeline
transform data-source="users.csv"(
    extract(columns="name,email,age")
    filter(age-min=18 status="active")
    format(
        email(lowercase=true validate=true)
        name(trim=true capitalize=true)
    )
    output(format=json destination="processed-users.json")
)

# API endpoint configuration
endpoint path="/api/users"(
    methods(get=true post=true put=false delete=false)
    auth(required=true type="bearer")
    rate-limit(requests=100 window="1h")
    validation(
        schema="user-schema.json"
        required-fields="name,email"
    )
    cache(ttl=300 strategy="lru")
)

# Monitoring configuration with nested alerts
monitoring service="web-app"(
    metrics(
        cpu(threshold=80 duration="5m")
        memory(threshold=85 duration="3m")
        disk(threshold=90 duration="1m")
    )
    alerts(
        email(recipients="ops@example.com")
        pagerduty(service-key="abc123")
        slack(webhook="https://hooks.slack.com/...")
    )
    dashboards(
        grafana(url="https://grafana.example.com")
        datadog(api-key="secret")
    )
)

# Complex search query
search index="products"(
    query(
        match(field="title" value="smartphone")
        filter(
            range(field="price" gte=200 lte=800)
            term(field="category" value="electronics")
        )
    )
    aggregations(
        terms(field="brand" size=10)
        histogram(field="price" interval=50)
    )
    sort(field="price" order="asc")
    limit=20
)
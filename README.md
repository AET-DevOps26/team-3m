# team-3m

Repository for team 3M

## Docker Compose

Run the Spring Boot server and React client:

```sh
docker compose up --build
```

The client is available at http://localhost:5173 and the server at http://localhost:8080.

The repository includes a root `.env.example` and a local `.env` with the default compose values. Update `.env` if you want to change the Postgres credentials or database name.

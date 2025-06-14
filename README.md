# Node.js REST API Test Application

This project is a Node.js REST API application, originally reimplemented from a Python (Flask) version. It serves as a backend for prototyping and testing infrastructure setups.

## Migration from Python to Node.js

This project was originally implemented in Python using the Flask framework. It has been reimplemented in Node.js using the Express.js framework to achieve the same core functionalities.

Key technology changes include:
-   **Backend Framework:** Flask (Python) -> Express.js (Node.js)
-   **Redis Client:** `redis` (Python) -> `ioredis` (Node.js)
-   **Prometheus Metrics:** `prometheus-flask-exporter` (Python) -> `prom-client` (Node.js)
-   **Logging:** Python's `logging` module -> `winston` (Node.js)

The API endpoints, request/response structures, and core logic (in-memory data store, Fibonacci calculation, etc.) have been kept consistent with the original Python version. The Docker setup has been updated to build and run the Node.js application (see Docker and Kubernetes section below).

## GOALS:
 - The application must be a REST api
 - Run in kubernetes

<br/>

## Docker and Kubernetes
The application provides CRUD operations and other utility endpoints via a REST API.

### Docker
The Node.js application is containerized using Docker. The `Dockerfile` is located in the `node_app/` directory.

**Build the Docker image (run from the project root):**
```bash
docker build -t nodebak:0.1 -f node_app/Dockerfile .
```

**Run the Docker container:**
```bash
docker run -t -p 5000:3000 nodebak:0.1
```
After running, the API will be accessible at `http://localhost:5000/api/`. The Node.js application listens on port 3000 internally, which is mapped to port 5000 externally by the `docker run` command.

### Kubernetes
To deploy in Kubernetes, you can adapt the provided YAML files in the `kubernetes/` directory.
```bash
kubectl apply -f kubernetes/
```
**Note:** If deploying to Kubernetes, update your deployment YAMLs to use the new Docker image name (e.g., `nodebak:0.1` instead of `pytbak:0.1`).

The following is an example of the Kubernetes pod status:
```
$ kubectl get pods -n pytbak
NAME                             READY   STATUS    RESTARTS   AGE
nodebak-deployment-xxxxxxxxx-xxxxx   1/1     Running   0          10m
```
(The pod name will reflect your updated Kubernetes deployment details.)

Remember to configure your Ingress controller and DNS as needed. The example Ingress (`03-ing-pytbak.yaml`) might need the `host` and `serviceName` updated.

<br/>

## Usage

The application serves an HTML page with API details at `/api/`.

Key API endpoints:

| HTTP Method | URI                                            | Action                     |
|-------------|:-----------------------------------------------|----------------------------|
| GET         | `http://[hostname]/api/get/context`            | Retrieve list of contexts  |
| GET         | `http://[hostname]/api/get/context/[context_id]` | Retrieve a context         |
| POST        | `http://[hostname]/api/post/context`           | Create a new context       |
| PUT         | `http://[hostname]/api/put/context/[context_id]` | Update an existing context |
| DELETE      | `http://[hostname]/api/delete/context/[context_id]`| Delete a context           |
| GET         | `http://[hostname]/api/fib/[number]`           | Generate Fibonacci number  |
| GET         | `http://[hostname]/api/count`                  | Increment Redis counter    |
| GET         | `http://[hostname]/api/redisping`              | Ping Redis                 |
| GET         | `http://[hostname]/api/sleep/[seconds]`        | Cause a delay              |

**Note:** Example server responses in the following sections might show Python/Werkzeug headers from the original version; actual headers will reflect the Node.js/Express server.

### Examples:

**Get all contexts:**
```bash
curl -i http://localhost:5000/api/get/context
```
*(Example output will be similar to the original, showing a list of context objects)*

**Create a new context:**
```bash
curl -i -H "Content-Type: application/json" -X POST -d '{"title":"Ubuntu 22.04 LTS", "description":"jammy"}' http://localhost:5000/api/post/context
```
*(Example output will show the newly created context object with its URI)*

**Update a context:**
```bash
curl -i -H "Content-Type: application/json" -X PUT -d '{"description":"Jammy Jellyfish"}' http://localhost:5000/api/put/context/5 
```
*(Assuming ID 5 exists; example output shows the updated context)*

**Delete a context:**
```bash
curl -i -H "Content-Type: application/json" -X DELETE http://localhost:5000/api/delete/context/5
```
*(Example output shows `{"result": true}`)*

**Get Fibonacci number:**
```bash
curl -i http://localhost:5000/api/fib/10
```

**Sleep (delay):**
```bash
time curl http://localhost:5000/api/sleep/3
```

<br/>

## Metrics
The application supports a `/metrics` endpoint for Prometheus.
```bash
curl http://localhost:5000/metrics
```
**Note:** The specific metrics exposed will be those provided by the Node.js `prom-client` library and any custom metrics defined in `node_app/app.js`. The format and some metric names will differ from the Python version's output.

<br/>

## Logs
The application logs to `/var/log/app.log` inside the container by default, and also to the console.
To view logs from a running Docker container:
```bash
# First, find your container ID
docker ps

# Then, exec into the container to view the log
docker exec -ti [container_id] cat /var/log/app.log
```
**Note:** Log format will correspond to the `winston` configuration in `node_app/app.js` and will differ from the Python/Werkzeug log format. Example:
```
2023-10-27 10:00:00,123 INFO ExpressApp: Server listening on http://0.0.0.0:3000
2023-10-27 10:00:05,456 INFO ExpressApp: GET /api/get/context HTTP/1.1
```

<br/>

run:
	go run ./cmd/server

run-auth:
	go run ./cmd/run-auth

run-finance:
	go run ./cmd/run-finance

run-attendance:
	go run ./cmd/run-attendance

build:
	go build -o bin/server ./cmd/server

build-all:
	go build -o bin/server ./cmd/server
	go build -o bin/run-auth ./cmd/run-auth
	go build -o bin/run-finance ./cmd/run-finance
	go build -o bin/run-attendance ./cmd/run-attendance

tidy:
	go mod tidy

vet:
	go vet ./...

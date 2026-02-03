NAME := wtm

.PHONY: install start test build clean

install:
	bun install

start:
	bun run start

test:
	bun run test

build:
	bun run build
	bun run build:types

clean:
	rm -rf node_modules dist

ALL_TESTS = $(shell find tests/ -name '*.test.js')
REPORTER = spec
UI = bdd
ENV = test

test:
	@NODE_ENV=$(ENV) ./node_modules/.bin/mocha \
		--require should \
		--require tests/common.js \
		--reporter $(REPORTER) \
		--ui $(UI) \
		--timeout 5000 \
		--growl \
		$(ALL_TESTS)

todo:
	grep "@TODO" -R ./

.PHONY: test todo

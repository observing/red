ALL_TESTS = $(shell find tests/ -name '*.test.js')
PLUGINS = wrap,debug,crush
REPORTER = spec
UI = bdd
ENV = test

install:
	@npm install .
	@git clone https://github.com/visionmedia/node-jscoverage.git jscoverage
	@cd jscoverage && ./configure && make && make install
	@rm -rf ./jscoverage

todo:
	grep "@TODO" -R ./lib

hook:
	@echo "make test" >> ./.git/hooks/pre-commit
	@chmod +x ./.git/hooks/pre-commit

test:
	@NODE_ENV=$(ENV) ./node_modules/.bin/mocha \
		--require should \
		--require tests/common.js \
		--reporter $(REPORTER) \
		--ui $(UI) \
		--timeout 5000 \
		--growl \
		$(ALL_TESTS)

nyan:
	$(MAKE) test REPORTER=nyan

lib-cov:
	@rm -rf ./lib-cov
	@jscoverage lib lib-cov

test-cov: lib-cov
	@RED_COVERAGE=1 $(MAKE) test REPORTER=html-cov > coverage.html

client:
	@square --bundle . --plugin $(PLUGINS) $(SQUARE)

.PHONY: test todo install lib-cov

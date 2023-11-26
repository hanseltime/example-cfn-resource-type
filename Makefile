# IMPORTANT - This makefile contains commands for SAM CLI to run the build of the file
# Please see: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/building-custom-runtimes.html

# For Docker container builds (i.e. we build everything in a docker container),
# you must set the IN_DOCKER=true environment variable

# Get current location of this file
mkfile_path := $(abspath $(lastword $(MAKEFILE_LIST)))
mkfile_dir := $(dir $(mkfile_path))

tmp_build_dir := tmp
tmp_pack_file := $(tmp_build_dir)/tmp-pack.tgz
tmp_yarn_wrap := $(tmp_build_dir)/yarn-wrap
lambda_bin_dir := lambda-bin

# make sure to install yarn if running in docker
OS := $(shell uname)
$(info    OS IS $(OS))
yarn-install: copy-yarn-wrap
	if [ "$$IN_DOCKER" == "true" ]; then \
		corepack enable; \
		yarn --version; \
		yarn install; \
	else \
		echo "No IN_DOCKER environment set.  Assuming this is a machine build"; \
	fi

# Creates a nested set of dependencies in a file for unpacking in the docker environment
create-yarn-wrap:
	yarn prod-install --no-production $(tmp_yarn_wrap)

# Designed for unpacking in the environment
copy-yarn-wrap:
	if [ "$$IN_DOCKER" == "true" ]; then \
		if [ ! -d "$(tmp_yarn_wrap)" ]; then \
			echo "No $(tmp_yarn_wrap) found.  Please ensure you have run 'make create-yarn-wrap' on your build machine."; \
			exit 1; \
		fi; \
		cp -R $(tmp_yarn_wrap)/. ./; \
	else \
		echo "No IN_DOCKER environment set.  Assuming this is a machine build"; \
	fi

# Main Build functions
build-TypeFunction: esbuild-flow
build-TestEntrypoint: esbuild-flow

# The Following are build stage methods
esbuild-flow: yarn-install esbuild install-kubectl pack copy-to-build-folder clean-pack-tmp-artifacts

esbuild:
	if [ "$$IN_DOCKER" != "true" ]; then \
		cd "$(mkfile_dir)"; \
	fi; \
	yarn --version && yarn es-build && echo "$(ARTIFACTS_DIR)"

pack: clean-pack-tmp-artifacts
	if [ "$$IN_DOCKER" != "true" ]; then \
		cd "$(mkfile_dir)"; \
	fi; \
	yarn pack -o $(tmp_pack_file)

copy-to-build-folder:
	if [ "$$IN_DOCKER" != "true" ]; then \
		cd "$(mkfile_dir)"; \
	fi; \
	tar -xvzf $(tmp_pack_file) -C $(tmp_build_dir) && cp -R $(tmp_build_dir)/package/. $(ARTIFACTS_DIR)

clean-pack-tmp-artifacts:
	if [ "$$IN_DOCKER" != "true" ]; then \
		cd "$(mkfile_dir)"; \
	fi; \
	rm -rf $(tmp_build_dir) && mkdir $(tmp_build_dir)

# TODO: if this requires the use of sequelize, etc, then you will need to 
# switch the following command to the build-<function> commands
yarn-pnp-flow: yarn-install ts-build create-pnp-folder install-kubectl pack copy-to-build-folder clean-pack-tmp-artifacts

ts-build:
	if [ "$$IN_DOCKER" != "true" ]; then \
		cd "$(mkfile_dir)"; \
	fi; \
	yarn build

create-pnp-folder:
	if [ "$$IN_DOCKER" != "true" ]; then \
		cd "$(mkfile_dir)"; \
	fi; \
	yarn prod-install $(ARTIFACTS_DIR)

# Inserts a pnp lookup and call, assuming the file is one parent away from the .pnp.cjs
insert-pnp-files:
	if [ "$$IN_DOCKER" != "true" ]; then \
		cd "$(mkfile_dir)"; \
	fi; \
	cd "$(ARTIFACTS_DIR)"; \
	file="dist/handlers.js"; \
	firstLine=$$(head -n 1 $$file); \
	if [[ "$$firstLine" != "\"use strict\";" ]]; then \
		postfix=$$(cat $$file); \
		printf "require(‘../.pnp.cjs’).setup();\n$$postfix" > $$file; \
	else \
		postfix=$$(tail -n +2 $$file); \
		printf "\"use strict\";\nrequire('../.pnp.cjs').setup();\n$$postfix" > $$file; \
	fi

## Layer equivalent, stores additional binaries that we want to use in 
# Creates a layer that provides kubectl binary (for linux x86) in the correct bin path
# Installation adapted from: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
install-kubectl:
	curl --fail -LO "https://dl.k8s.io/release/$$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"; \
	echo "Validating kubectl package integrity..."; \
	curl --fail -LO "https://dl.k8s.io/$$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256" \
	echo "$$(cat kubectl.sha256)  kubectl" | sha256sum --check; \
	echo "installing kubectl to layer folder"; \
	mkdir $(ARTIFACTS_DIR)/$(lambda_bin_dir); \
	install -o root -g root -m 0755 kubectl $(ARTIFACTS_DIR)/$(lambda_bin_dir)/kubectl;
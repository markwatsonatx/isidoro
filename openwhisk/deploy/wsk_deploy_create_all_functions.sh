#!/usr/bin/env bash
./wsk_set_env_prod.sh
./wsk_deploy_func_to_prod.sh create Isidoro ../functions/isidoro.js
'use strict';

const express = require('express') 
const sls = require('serverless-http')
const app = express() 
const serverFunction = require('./services/servers/serverFunction');	

serverFunction.syncActiveClusters();;

module.exports = {app};
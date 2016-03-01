module.exports = {


  friendlyName: 'Get connection',


  description: 'Get an active connection to the PostgreSQL database from the pool.',


  inputs: {

    connectionString: {
      description: 'A connection string to use to connect to a PostgreSQL database.',
      extendedDescription: 'Be sure to include credentials and the name of an existing database on your PostgreSQL server.',
      moreInfoUrl: 'http://www.postgresql.org/docs/9.4/static/libpq-connect.html',
      example: 'postgres://localhost:5432/myproject',
      required: true
    },

    meta: {
      friendlyName: 'Meta (custom)',
      description: 'Additional PostgreSQL-specific options to use when connecting.',
      extendedDescription: 'If specified, should be a dictionary. If there is a conflict between something provided in the connection string, and something in `meta`, the connection string takes priority.',
      moreInfoUrl: 'https://github.com/brianc/node-postgres/wiki/Client#new-clientobject-config--client',
      example: '==='
    }

  },


  exits: {

    success: {
      description: 'A connection was successfully acquired.',
      extendedDescription: 'This connection should be eventually released.  Otherwise, it may time out.  It is not a good idea to rely on database connections timing out-- be sure to release this connection when finished with it!',
      outputVariableName: 'report',
      outputDescription: 'The `connection` property is an active connection to the database.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        connection: '===',
        meta: '==='
      }
    },

    malformed: {
      description: 'The provided connection string is malformed.',
      extendedDescription: 'The provided connection string is not valid for PostgreSQL.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that (and preferably "why") the provided connection string is invalid.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    },

    failedToConnect: {
      description: 'Could not acquire a connection to the database using the specified connection string.',
      extendedDescription: 'This might mean any of the following:\n'+
      ' + the credentials encoded in the connection string are incorrect\n'+
      ' + there is no database server running at the provided host (i.e. even if it is just that the database process needs to be started)\n'+
      ' + there is no software "database" with the specified name running on the server\n'+
      ' + the provided connection string does not have necessary access rights for the specified software "database"\n'+
      ' + this Node.js process could not connect to the database, perhaps because of firewall/proxy settings\n'+
      ' + any other miscellaneous connection error',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that a connection could not be made.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    }

  },


  fn: function (inputs, exits) {
    var util = require('util');
    var Url = require('url');
    var pg = require('pg');



    // Build a local variable (`postgresClientConfig`) to house a dictionary
    // of additional PostgreSQL connection options that will be passed into `.connect()`.
    // (this is pulled from the `connectionString` and `meta` inputs, and used for
    //  configuring stuff like `host` and `ssl`)
    //
    // For a complete list of available options, see:
    //  • https://github.com/brianc/node-postgres/wiki/Client#new-clientobject-config--client
    var postgresClientConfig = {};



    // Validate and parse `meta` (if specified).
    if ( inputs.meta ) {
      if ( !util.isObject(inputs.meta) ) {
        return exits.error('If provided, `meta` must be a dictionary.');
      }

      // Use properties of `meta` directly as postgres client config.
      // (note that we're very careful to only stick a property on the client config if it was not undefined)
      ['host', 'port', 'database', 'user', 'password', 'ssl', 'application_name', 'fallback_application_name'].forEach(function (pgClientConfKeyName){
        if ( !util.isUndefined(inputs.meta[pgClientConfKeyName]) ) {
          postgresClientConfig[pgClientConfKeyName] = inputs.meta[pgClientConfKeyName];
        }
      });
    }


    // Validate & parse connection string, pulling out PostgreSQL client config
    // (call `malformed` if invalid).
    //
    // Remember: connection string takes priority over `meta` in the event of a conflict.
    try {
      var parsedConnectionStr = Url.parse(inputs.connectionString);

      // Validate that a protocol was found before other pieces
      // (otherwise other parsed info will be very weird and wrong)
      if (!parsedConnectionStr.protocol) {
        throw new Error('Protocol (i.e. `postgres://`) is required in connection string.');
      }

      // Parse port & host
      if (parsedConnectionStr.port) { postgresClientConfig.port = +parsedConnectionStr.port; }
      else { postgresClientConfig.port = 5432; }
      if (parsedConnectionStr.hostname) { postgresClientConfig.host = parsedConnectionStr.hostname; }
      else { postgresClientConfig.host = 'localhost'; }

      // Parse user & password
      if ( parsedConnectionStr.auth && util.isString(parsedConnectionStr.auth) ) {
        var authPieces = parsedConnectionStr.auth.split(/:/);
        if (authPieces[0]) {
          postgresClientConfig.user = authPieces[0];
        }
        if (authPieces[1]) {
          postgresClientConfig.password = authPieces[1];
        }
      }

      // Parse database name
      if (util.isString(parsedConnectionStr.pathname) ) {
        var databaseName = parsedConnectionStr.pathname;
        // Trim leading and trailing slashes
        databaseName = databaseName.replace(/^\/+/, '');
        databaseName = databaseName.replace(/\/+$/, '');
        // If anything is left, use it as the database name.
        if ( databaseName ) {
          postgresClientConfig.database = databaseName;
        }
      }
    }
    catch (e) {
      e.message =
      'Provided value (`'+inputs.connectionString+'`) is not a valid PostgreSQL connection string: '+
      e.message;
      return exits.malformed({
        error: e
      });
    }


    // pg.connect(inputs.connectionString, function afterConnected(err, client, done) {
    pg.connect(postgresClientConfig, function afterConnected(err, client, done) {
      // If an error occurs,
      if (err) {
        // Ensure the connection is actually dead
        // (probably unnecessary but doesn't hurt-- see https://github.com/brianc/node-postgres/issues/465#issuecomment-28735745)
        try { done(); } catch (e) {}

        // Then bail w/ `failedToConnect` error.
        return exits.failedToConnect({
          error: err
        });
      }

      // Bind "error" handler to prevent crashing the process if the database server crashes.
      // See https://github.com/mikermcneil/waterline-query-builder/blob/master/docs/errors.md#when-a-connection-is-interrupted
      client.on('error', function (err){
        console.warn('Warning: Connection to PostgreSQL database was lost. Did the database server go offline?');
        if (err) { console.warn('Error details:',err); }
        // If this gets annoying (since it's almost always accompanied by the other warning below)
        // then we could remove the per-connection warning and make it silent for now.

        // To test re: performance: should we call `done()` here?
      });

      // We must also bind a handler to the module global (`pg`) in order to handle
      // errors on the other connections live in the pool.
      // See https://github.com/brianc/node-postgres/issues/465#issuecomment-28674266
      // for more information.
      //
      // However we only bind this event handler once-- no need to bind it again and again
      // every time a new connection is acquired. For this, we use `pg._ALREADY_BOUND_CATCHALL_PG_ERROR_HANDLER_IN_THIS_PROCESS`.
      if (!pg._ALREADY_BOUND_CATCHALL_PG_ERROR_HANDLER_IN_THIS_PROCESS) {
        pg._ALREADY_BOUND_CATCHALL_PG_ERROR_HANDLER_IN_THIS_PROCESS = true;
        pg.on('error', function (err){
          // For now, we log a warning when this happens.
          console.warn('Warning: One or more pooled connections to PostgreSQL database were lost. Did the database server go offline?');
          if (err) { console.warn('Error details:',err); }
        });
      }

      // Build the "connection" and pass it back.
      // This will be passed in to other methods in this driver.
      var connection = {
        client: client,
        release: done
      };

      return exits.success({
        connection: connection
      });
    });//</pg.connect()>
  }


};

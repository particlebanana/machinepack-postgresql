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

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'A connection was successfully acquired.',
      extendedDescription: 'This connection should be eventually released.  Otherwise, it may time out.  It is not a good idea to rely on database connections timing out-- be sure to release this connection when finished with it!',
      outputVariableName: 'report',
      outputDescription: 'The `connection` property is an active connection to the database.  The `meta` property is reserved for custom adapter-specific extensions.',
      example: {
        connection: '===',
        meta: '==='
      }
    },

    malformed: {
      description: 'The provided connection string is malformed.',
      extendedDescription: 'The provided connection string is not valid for PostgreSQL.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that (and preferably "why") the provided connection string is invalid.  The `meta` property is reserved for custom adapter-specific extensions.',
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
      outputDescription: 'The `error` property is a JavaScript Error instance explaining that a connection could not be made.  The `meta` property is reserved for custom adapter-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    }

  },


  fn: function (inputs, exits) {
    var pg = require('pg');

    // TODO: validate connection string and call `malformed` if invalid
    // -OR-
    // just figure out how to negotiate the problem in the error from the driver
    // and handle it there


    // TODO: Support special options like `meta.ssl`
    pg.connect(inputs.connectionString, function afterConnected(err, client, done) {
      if (err) {
        return exits.failedToConnect({
          error: err
        });
      }

      // Build the "connection" and pass it back.
      // This will be passed in to other methods in this adapter.
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

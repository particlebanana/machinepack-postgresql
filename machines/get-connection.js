module.exports = {


  friendlyName: 'Get connection',


  description: 'Get a connection from a connection pool.',


  extendedDescription: 'If a pool has not been created, a new one will be made. See https://github.com/brianc/node-postgres/wiki/pg#connectstring-connectionstring-function-callback for more.',


  cacheable: false,


  sync: false,


  inputs: {

    connectionString: {
      description: 'A string containing the credentials needed to connect to a postgresql database.',
      example: 'postgres://localhost:5432',
      required: true
    }

  },


  exits: {

    success: {
      variableName: 'result',
      description: 'An open PostgreSQL connection.',
      example: {
        client: '===',
        release: '==='
      }
    },

    invalidConnection: {
      description: 'The connection string was incorrect or a client could not connect.'
    },

    error: {
      description: 'An unexpected error occurred.'
    }

  },


  fn: function getConnection(inputs, exits) {
    var pg = require('pg');
    var conString = inputs.connectionString;

    pg.connect(conString, function connect(err, client, done) {
      if (err) {
        return exits.invalidConnection();
      }

      return exits.success({
        client: client,
        release: done
      });
    });
  }


};

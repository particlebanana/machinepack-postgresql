module.exports = {


  friendlyName: 'Compile Query',


  description: 'Compile an RQL query to a SQL query.',


  cacheable: true,


  sync: true,


  inputs: {

    query: {
      description: 'An RQL query object.',
      example: {},
      required: true
    }

  },


  exits: {

    success: {
      variableName: 'result',
      description: 'A SQL query',
      example: {
        query: 'Select * from User',
        bindings: ['name']
      }
    },

    error: {
      variableName: 'error',
      description: 'An unexpected error occured.'
    },

    malformed: {
      variableName: 'malformed',
      description: 'The query could not be compiled due to a malformed syntax.'
    }

  },


  fn: function compileQuery(inputs, exits) {
    var Builder = require('machinepack-sql-builder');

    Builder.generateQuery({
      query: inputs.query
    }).exec({
      error: function error(err) {
        return exits.error(err);
      },
      malformed: function malformed(err) {
        return exits.malformed(err);
      },
      success: function success(query) {
        return exits.success(query);
      }
    });
  }


};

module.exports = {


  friendlyName: 'Release connection',


  description: 'Releases an active connection back into the pool.',


  cacheable: false,


  sync: true,


  inputs: {

    release: {
      description: 'The release value created when a connection was opened.',
      example: '===',
      required: true
    }

  },


  exits: {

    success: {
      variableName: 'result',
      description: 'Done.',
    },

  },


  fn: function(inputs, exits) {
    inputs.release();
    return exits.success();
  },



};

# Sequelize-Auto

[![Build Status](http://img.shields.io/travis/sequelize/sequelize-auto/master.svg)](https://travis-ci.org/sequlize/sequelize-auto) [![Dependency Status](https://david-dm.org/sequelize/sequelize-auto.svg)](https://david-dm.org/sequelize/sequelize-auto)

Automatically generate models for [SequelizeJS](https://github.com/sequelize/sequelize) via the command line.

## Install

    npm install -g sequelize-auto

## Usage

    sequelize-auto -h <host> -d <database> -u <user> -x [password] -p [port]  --dialect [dialect] -c [/path/to/config] -o [/path/to/models] -s [true|false] -t [true|false]

    Options:
      -h, --host        IP/Hostname for the database.                                      [required]
      -d, --database    Database name.                                                     [required]
      -u, --user        Username for database.                                             [required]
      -x, --pass        Password for database.
      -p, --port        Port number for database.
      -c, --config      JSON file for sending additional options to the Sequelize object.
      -o, --output      What directory to place the models.
      -s, --singular    The model name is the same as the table.
      -t, --timestamps  Whether the table has the properties 'createdAt' and 'updatedAt'
      -e, --dialect     The dialect/engine that you're using: postgres, mysql, sqlite


## Example

    sequelize-auto -o "./models" -d sequelize_auto_test -h localhost -u daniel -p 5432 -x my_password -e postgres -t true -e true

Produces a file/files such as ./models/Users.js which looks like:

    /* jshint indent: 2 */

    module.exports = function(sequelize, DataTypes) {
      return sequelize.define('Users', {
        username: {
          type: DataTypes.STRING,
          allowNull: true,
          defaultValue: null
        },
        touchedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null
        },
        aNumber: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: null
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: null
        }
      });
    };

Which makes it easy for you to simply [Sequelize.import](http://docs.sequelizejs.com/en/latest/docs/models/#import) it.

## Testing

You must setup a database called "sequelize_auto_test" first, edit the spec/config.js file accordingly, and then enter in any of the following:

    # for all
    npm run test-buster

    # mysql only
    npm run test-buster-mysql

    # postgres only
    npm run test-buster-postgres

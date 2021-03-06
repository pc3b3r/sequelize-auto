var Sequelize = require('sequelize'),
  async = require('async'),
  untildify = require('untildify'),
  fs = require('fs');

module.exports = (function() {
  var AutoSequelize = function(database, username, password, options) {
    this.sequelize = new Sequelize(database, username, password, options || {});
    this.queryInterface = this.sequelize.getQueryInterface();
    this.options = {};
  }

  AutoSequelize.prototype.run = function(options, callback) {
    var self = this,
      text = {};

    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    options.global = options.global || 'Sequelize';
    options.local = options.local || 'sequelize';
    options.spaces = options.spaces || false;
    options.indentation = options.indentation || 1;
    options.directory = options.directory || './models';
    options.singular = options.singular || false;
    options.timestamps = options.timestamps || true;

    self.options = options;

    this.sequelize.query(this.queryInterface.QueryGenerator.showTablesQuery(), {
        type: self.sequelize.QueryTypes.SELECT,
        raw: true
      })
      .error(function(err) {
        console.log('ERR: ' + err);
      })
      .then(function(tables) {
        var _tables = {};
        async.each(tables, function(table, _callback) {
          var key = "";
          for (elem in table)
            key = elem;
          var tableName = table[key];
          self.queryInterface.describeTable(tableName)
            .then(function(fields) {
              console.log(fields);
              _tables[tableName] = fields;
              _callback(null);
            });
        }, function() {
          var tableNames = Object.keys(_tables);
          async.each(tableNames, function(table, _callback) {
            var fields = Object.keys(_tables[table]),
              spaces = '';

            for (var x = 0; x < options.indentation; ++x) {
              spaces += (options.spaces === true ? ' ' : "\t");
            }

            text[table] = "/* jshint indent: " + options.indentation + " */\n\n";
            text[table] += "module.exports = function(sequelize, DataTypes) {\n";
            text[table] += spaces + "return sequelize.define('" + table + "', { \n";

            console.log(" --- --- --- " + table + " --- --- --- ");

            fields.forEach(function(field, i) {
              text[table] += spaces + spaces + field + ": {\n";
              var fieldAttr = Object.keys(_tables[table][field]);
              // Serial key for postgres...
              var defaultVal = _tables[table][field].defaultValue;
              if (Sequelize.Utils._.isString(defaultVal) && defaultVal.toLowerCase().indexOf('nextval') !== -1 && defaultVal.toLowerCase().indexOf('regclass') !== -1) {
                text[table] += spaces + spaces + spaces + "type: DataTypes.INTEGER,\n";
                text[table] += spaces + spaces + spaces + "primaryKey: true\n";
              } else {
                // ENUMs for postgres...
                if (_tables[table][field].type === "USER-DEFINED" && !!_tables[table][field].special) {
                  _tables[table][field].type = "ENUM(" + _tables[table][field].special.map(function(f) {
                    return "'" + f + "'";
                  }).join(',') + ")";
                }

                fieldAttr.forEach(function(attr, x) {
                  var writeLine = true;
                  // We don't need the special attribute from postgresql describe table..
                  if (attr === "special") {
                    return true;
                  } else if (attr === "allowNull") {
                    text[table] += spaces + spaces + spaces + attr + ": " + _tables[table][field][attr];
                  } else if (attr === "defaultValue") {
                    var val_text = defaultVal;
                    if (Sequelize.Utils._.isString(defaultVal)) {
                      if (_tables[table][field].type === 'TIMESTAMP') {
                        val_text = "sequelize.NOW";
                      } else {
                        val_text = "'" + val_text + "'";
                      }
                    }
                    if (defaultVal === null) {
                      return true;
                    } else {
                      text[table] += spaces + spaces + spaces + attr + ": " + val_text;
                    }
                  } else if (attr === "type" && _tables[table][field][attr].indexOf('ENUM') === 0) {
                    text[table] += spaces + spaces + spaces + attr + ": DataTypes." + _tables[table][field][attr];
                  } else {
                    var _attr = "";
                    if (attr === 'primaryKey') {
                      if (_tables[table][field][attr] === true) {
                        _attr = _tables[table][field][attr].toString().toLowerCase();
                        val = "'" + _tables[table][field][attr].toString() + "'";
                        text[table] += spaces + spaces + spaces + attr + ": " + val;
                      } else {
                        writeLine = false;
                      }
                    } else {
                      _attr = _tables[table][field][attr].toLowerCase();
                      val = "'" + _tables[table][field][attr] + "'";

                      if (_attr === "tinyint(1)" || _attr === "boolean") {
                        val = 'DataTypes.BOOLEAN';
                      } else if (_attr.match(/^(smallint|mediumint|tinyint|int)/)) {
                        var length = _attr.match(/\(\d+\)/);
                        val = 'DataTypes.INTEGER' + (!!length ? length : '');
                      } else if (_attr.match(/^bigint/)) {
                        val = 'DataTypes.BIGINT';
                      } else if (_attr.match(/^string|varchar|varying|nvarchar/)) {
                        val = 'DataTypes.STRING';
                      } else if (_attr.match(/text|ntext$/)) {
                        val = 'DataTypes.TEXT';
                      } else if (_attr.match(/^(date|time)/)) {
                        val = 'DataTypes.DATE';
                      } else if (_attr.match(/^(float|decimal)/)) {
                        val = 'DataTypes.' + _attr.toUpperCase();
                      }
                      text[table] += spaces + spaces + spaces + attr + ": " + val;
                    }
                  }

                  var next = fieldAttr[x + 1];
                  var nextVal = _tables[table][field][fieldAttr[x + 1]];

                  if ((x + 1) < fieldAttr.length && next !== "special") {
                    //Skip fake PK and defaultValue = null
                    var doubleNext = fieldAttr[x + 2];
                    var doubleNextVal = _tables[table][field][fieldAttr[x + 2]];
                    if (next === "defaultValue" && nextVal === null) {
                      if (doubleNext === "primaryKey" && doubleNextVal !== false) {
                        text[table] += ",";
                      }
                    } else {
                      if (!(next === "primaryKey" && nextVal === false))
                        text[table] += ",";
                    }
                  }
                  if (writeLine)
                    text[table] += "\n";
                });
              }

              text[table] += spaces + spaces + "}";
              if ((i + 1) < fields.length) {
                text[table] += ",";
              }
              text[table] += "\n";
            });
            //Adding singular table name
            if (options.singular) {
              text[table] += spaces + "},\n" + spaces + "{\n";
              text[table] += spaces + spaces + "tableName : '" + table + "'";
            }

            if (options.timestamps === "false") {
              text[table] += ",\n";
              text[table] += spaces + spaces + "timestamps : false";
            }
            text[table] += spaces + "\n});\n};\n";
            _callback(null);
          }, function() {
            self.sequelize.close();
            self.write(text, callback);
          });
        });
      });
  }

  AutoSequelize.prototype.write = function(attributes, callback) {
    var tables = Object.keys(attributes),
      self = this;

    async.series([
      function(_callback) {
        self.options.directory = untildify(self.options.directory);
        fs.lstat(self.options.directory, function(err, stat) {
          if (err || !stat.isDirectory()) {
            fs.mkdir(self.options.directory, _callback);
          } else {
            _callback(null);
          }
        })
      }
    ], function(err) {
      if (err) return callback(err);

      async.each(tables, function(table, _callback) {
        fs.writeFile(self.options.directory + '/' + table + '.js', attributes[table], function(err) {
          if (err) return _callback(err);
          _callback(null);
        });
      }, function(err) {
        callback(err, null);
      });
    });
  }

  return AutoSequelize;
})();

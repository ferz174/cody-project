//
// Johan Coppieters - mar 2013 - cody
//
//
console.log("loading " + module.id);

var cody = require("./../index.js");


function User(basis) {
  // copy from basis
  for (var a in basis) {
    if (basis.hasOwnProperty(a)) {
      this[a] = basis[a];
    }
  }
  this.id = this.id || 0;
  this.maxbadlogins = this.maxbadlogins || 999;
  this.badlogins = this.badlogins || 0;
  this.level = this.level || 0;
  this.active = this.active || "N";
  this.nomail = this.nomail || "N";
  this.note = this.note || "";
  this.sortorder = this.sortorder || 10;
}

module.exports = User;

User.getUsers = function(controller, level, store) {
  controller.query("select * from users where "+(cody.config.dbsql == "pg" ? 'level <= $1 order by name' : 'level <= ? order by name'),
  [level],
  function(err, result) {
    if (err) { console.log(err); throw(new Error("User.getUsers failed with sql errors")); }
    store(result.rows ? result.rows : result);
  });
};

User.getDomains = function(controller, store) {
  controller.query("select distinct domain from users order by domain",
  [],
  function(err, result) {
    if (err) { console.log(err); throw(new Error("User.getDomains failed with sql errors")); }
    store(result.rows ? result.rows : result);
  });
};

User.getLevels = function(controller, level, store) {
  controller.query("select id, name from levels where "+(cody.config.dbsql == "pg" ? 'id <= $1 order by id' : 'id <= ? order by id'),
  [level],
  function(err, result) {
    if (err) { console.log(err); throw(new Error("User.getLevels failed with sql errors")); }
    store(result.rows ? result.rows : result);
  });
};

User.getUser = function() {
  // either:
  //   getUser(controller, username, password, store)
  // or
  //   getUser(controller, id, store)
  
  var controller = arguments[0];
  var store;
  
  if (arguments.length === 5) {
    store = arguments[4];
    controller.query("select * from users where "+(cody.config.dbsql == "pg" ? 'username = $1 and password = md5($2)' : 'username = ? and password = password(?)'),
	[arguments[2], arguments[3]],
	function(error, result) {
      if (error) { console.log(error); throw(new Error("User.getUser failed with sql errors")); }
      store(new User((result.rows ? result.rows : result)[0]));
   });
   
  } else if (arguments.length === 4) {
    store = arguments[3];
    controller.query("select * from users where "+(cody.config.dbsql == "pg" ? 'username = $1' : 'username = ?'),
	[arguments[2]],
	function(error, result) {
      if (error) { console.log(error); throw(new Error("User.getUser failed with sql errors")); }
      store(new User((result.rows ? result.rows : result)[0]));
    });
    
  } else if (arguments.length === 3) {
    store = arguments[2];  
    controller.query("select * from users where "+(cody.config.dbsql == "pg" ? 'id = $1' : 'id = ?'),
	[arguments[1]],
	function(error, result) {
      if (error) { console.log(error); throw(new Error("User.getUser failed with sql errors")); }
      store(new User((result.rows ? result.rows : result)[0]));
    });
  }
};

User.deleteUser = function(controller, id, finish) {
  controller.query("delete from users where "+(cody.config.dbsql == "pg" ? 'id = $1' : 'id = ?'),
  [id],
  function(error, result) {
    if (error) {  
      console.log("User.deleteUser: error during delete of user with id = " + id); 
      console.log(error); 
    } else {
      console.log("deleted user id = " + id);
    }

    finish(typeof error === "undefined");
  });
};


// 
// instance methods
//

User.prototype.getDomain = function() {
	return this.domain || "";
};

User.prototype.getLevel = function() {
	return this.level || 0;
};

User.prototype.getId = function() {
  return this.id || 0;
};

User.prototype.getSortOrder = function() {
  return this.sortorder || 10;
};

User.prototype.getEmail = function() {
	return this.email || "";
};

User.prototype.isActive = function() {
	return (this.active) ? (this.active === "Y") : false;
};

User.prototype.scrapeFrom = function(controller) {
  this.username = controller.getParam("username", this.username);
  this.password = controller.getParam("password", "");
  this.name = controller.getParam("name", this.name);
  this.domain = controller.getParam("domain", this.domain);
  this.level = controller.getInt("level", this.level);
  this.email = controller.getParam("email", this.email);
  this.note = controller.getParam("note", this.note);
  this.nomail = controller.getParam("nomail", this.nomail);
  this.badlogins = controller.getParam("badlogins", this.badlogins);
  this.maxbadlogins = controller.getParam("maxbadlogins", this.maxbadlogins);
  this.active = controller.getParam("active", this.active);
  this.sortorder = controller.getParam("sortorder", this.sortorder);
};

// not on prototype, no user object exists
User.addBadLogin = function(controller, theUserName, finish) {
  controller.query("update users set badlogins = badlogins + 1 where "+(cody.config.dbsql == "pg" ? 'username = $1' : 'username = ?'),
  [theUserName],
  finish);
};

User.prototype.clearBadLogins = function(controller, finish) {
  var self = this;
  
  if (self.badlogins > 0) { 
    controller.query("update users set badlogins = 0 where "+(cody.config.dbsql == "pg" ? 'username = $1' : 'username = ?'),
	[self.username],
	function(err, result) {
      if (err) { console.log(err); throw(new Error("User.clearBadLogins failed with sql errors")); }
      console.log("Cleared bad logins");
      finish();
    });
  } else { 
    // no need to access the database if there are no badLogins
    finish(); 
  }
};


User.prototype.doUpdate = function(controller, finish) {
  var self = this;
  var values = [self.username, self.name, self.domain, self.level, self.badlogins, self.maxbadlogins, self.active, self.email, self.note, self.nomail, self.sortorder];
  
  // new or existing record
  if ((typeof self.id === "undefined") || (self.id === 0)) {

    console.log("insert user " + this.username);
    values.push(self.password);
    controller.query("insert into users (username, name, domain, level, badlogins, maxbadlogins, active, email, note, nomail, sortorder, password) values "+(cody.config.dbsql == "pg" ? '($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, md5($12)) returning id' : '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, password(?))'),
	values,
        function(err, result) {
          if (err) {
            console.log(err); throw(new Error("User.doUpdate/insert failed with sql errors")); 
          } else {
            self.id = result.rows ? result.rows[0].id : result.insertId;
            console.log("inserted user: " + self.id);
            if (typeof finish === "function") { finish(); }
          }
    });
    
  } else {
    console.log("update user " + self.id + " - " + this.username);
    values.push(self.id);
    controller.query("update users set "+(cody.config.dbsql == "pg" ? 'username = $1, name = $2, domain = $3, level = $4, badlogins = $5, maxbadlogins = $6, active = $7, email = $8, note = $9, nomail = $10, sortorder = $11 where id = $12' : 'username = ?, name = ?, domain = ?, level = ?, badlogins = ?, maxbadlogins = ?, active = ?, email = ?, note = ?, nomail = ?, sortorder = ? where id = ?'),
	values,
      function(err) {
        if (err) { 
          console.log(err); throw(new Error("User.doUpdate/update failed with sql errors"));
        } else {
          console.log("updated user: " + self.id);
          if (self.password != "") {
            controller.query("update users set "+(cody.config.dbsql == "pg" ? 'password = md5($1) where id = $2' : 'password = password(?) where id = ?'),
			[self.password, self.id],
			function() {
              if (err) {
                console.log(err); throw(new Error("User.doUpdate/update PW failed with sql errors"));
              }
              console.log("updated password of " + self.id);
              if (typeof finish === "function") {
                finish();
              }
            });
          } else if (typeof finish === "function") {
            finish();
          }
        }
    });
  }
};

User.prototype.doDelete = function(controller, finish) {
  var self = this;
  controller.query("delete from users where "+(cody.config.dbsql == "pg" ? 'id = $1' : 'id = ?'),
  [self.id],
  function(isOK) {
    if (typeof finish === "function") { finish(isOK); }
  });
};


User.emailExists = function (controller, email, finish) {
 controller.query("select * from users where "+(cody.config.dbsql == "pg" ? 'email = $1' : 'email = ?'),
 [email],
 function (err, result) {
   if (err)
     return finish(err);
   finish(undefined, (result.rows ? result.rows : result).length > 0);
 });
};

User.getByEmail = function (controller, email, finish) {
 controller.query("select * from users where "+(cody.config.dbsql == "pg" ? 'email = $1' : 'email = ?'),
 [email],
 function (err, result) {
   result = result.rows ? result.rows : result;
   if (err) return finish(err);
   if (result.length > 0) {
     return finish(undefined, new User(result[0]));
   }
   return finish(undefined, new User());
 });
};

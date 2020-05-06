// Tim & Jonas V1.0 -- running from within the cody project directory
//
// Johan: v1.1 -- using path, creating a startup file in the root dir of cody projects, ...
//                this resembles the hosting setup.


var readline = require("readline");
var util     = require("util");
var fs       = require("fs");
var mysql    = require("mysql");
var path     = require("path");

var rootwd = process.cwd();
var codywd = rootwd + "/node_modules/cody";

// https://gist.github.com/tkihira/3014700
var mkdir = function (dir) {
  // making directory without exception if exists
  try {
    fs.mkdirSync(dir, 0775);
  } catch (e) {
    if (e.code !== "EEXIST") {
      throw e;
    }
  }
};

var copyDir = function (src, dest) {
  mkdir(dest);
  var files = fs.readdirSync(src);
  var i;
  for (i = 0; i < files.length; i++) {
    var current = fs.lstatSync(path.join(src, files[i]));
    if(current.isDirectory()) {
      copyDir(path.join(src, files[i]), path.join(dest, files[i]));
    } else if(current.isSymbolicLink()) {
      var symlink = fs.readlinkSync(path.join(src, files[i]));
      fs.symlinkSync(symlink, path.join(dest, files[i]));
    } else {
      copy(path.join(src, files[i]), path.join(dest, files[i]));
    }
  }
};

var copy = function (src, dest) {
  var oldFile = fs.createReadStream(src);
  var newFile = fs.createWriteStream(dest);
  oldFile.pipe(newFile);
};

/**
 * Look ma, it's cp -R.
 * @param {string} src The path to the thing to copy.
 * @param {string} dest The path to the new copy.
 */
var copyRecursiveSync = function(src, dest) {
  // console.log(src + " -> " + dest);
  var exists = fs.existsSync(src);
  var stats = exists && fs.statSync(src);
  var isDirectory = exists && stats.isDirectory();
  if (fs.existsSync(dest)) return;
  if (exists && isDirectory) {
    console.log("mkdir " + dest);
    fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
        path.join(dest, childItemName));
    });
  } else {
    fs.linkSync(src, dest);
  }
};


var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("\nCreating project in ", rootwd + "/");

rl.question("\n1) Enter sitename: ", function (sitename) {
  console.log("Note: also using " + sitename + " as database name.");
  console.log("Note: by default the mysql root user has no password so you can just hit enter, if you forgot the root password");
  console.log("http://dev.mysql.com/doc/refman/5.0/en/resetting-permissions.html");
  
  rl.question("\n2) Enter root password for mysql so we can create a new database and user: ", function (dbrootpw) {
    
    rl.question("\n3) Enter site database user ("+sitename+"): ", function (dbuser) {
		dbuser = dbuser || sitename;
      
      rl.question("\n4) Enter site database password ("+dbrootpw+"): ", function (dbpass) {
		  dbpass = dbpass || dbrootpw;

        rl.question("\n5) Enter dbhost for database (localhost): ", function (dbhost) {
			dbhost = dbhost || "localhost";
             
          rl.question("\n6) Enter hostname for site ("+sitename+"): ", function (hostname) {
			hostname = hostname || sitename;
			var con = mysql.createConnection({
				host: dbhost,
				user: "root",
				password: dbrootpw,
				multipleStatements: true
			});

			  rl.question("\n7) Enter port for site (3001): ", function (siteport) {
				  siteport = siteport || "3001";
				  
				rl.question("\n8) Enter language for site (default: en, or | nl | ru | zh |): ", function (language) {
					language = language || "en"
				  
				  rl.question("\n9) Enter a location for storing documents ("+rootwd+"): ", function (datadir) {
					  datadir = datadir || rootwd;
				  
					console.log("dbhost is "+dbhost);
					con.connect();
					con.query("create database " + sitename + " default charset utf8", function (err) {
					  if (err) console.log(err);
					  con.query("grant all on " + sitename + ".* to '" + dbuser + "'@'%' identified by '" + dbpass + "'", function (err) {
						if (err) console.log(err);

						con.query("grant all on " + sitename + ".* to '" + dbuser +"'@'"+ dbhost + "' identified by '" + dbpass + "'", function (err) {
						  if (err) console.log(err);

						  con.end();
						  con = mysql.createConnection({
							host: dbhost,
							user: dbuser,
							database: sitename,
							password: dbpass,
							multipleStatements: true
						  });
						  console.log("dbhost is "+dbhost);
						  con.connect();

						  mkdir(path.join(rootwd, sitename));
							fs.readdirSync(codywd + "/doc/empty").forEach(function (src) {
							  copyRecursiveSync(path.join(codywd,"doc","empty", src), path.join(rootwd, sitename , src));
							});

							fs.readFile(path.join(rootwd, sitename, "empty.sql"), function (err, initstatements) {
							  if (err) throw err;

							  con.query(initstatements.toString(), function (err) {
								if (err) throw err;

								fs.writeFileSync(path.join(rootwd, sitename, "config.json"), JSON.stringify(
								  {
										name: sitename,
										smtp: "smtp.mail."+hostname,
										mailfrom: hostname+"@mail",
										smtppass: dbpass,
										smtpssl:"587",
										mailfrom: "info@"+hostname,
										hostnames: "localhost,"+hostname,
										db: sitename.replace(/-/g,"_"),
										dbuser: dbuser,
										dbpassword: dbpass,
										dbhost: dbhost,
										version: "v 3.0",
										defaultlanguage: language,
										datapath: datadir+"/"+sitename,
										port: siteport
								  }));
								copy(path.join(rootwd, sitename, "index.js"), path.join(rootwd, sitename+".js"));
								fs.unlinkSync(path.join(rootwd, sitename, "index.js"));


								mkdir(datadir);
								mkdir(path.join(datadir,sitename));
								console.log("created "+datadir+"/"+sitename+"/");
								mkdir(path.join(datadir,sitename,"images"));
								console.log("created "+datadir+"/"+sitename+"/images");
								mkdir(path.join(datadir,sitename,"files"));
								console.log("created "+datadir+"/"+sitename+"/files");


								console.log("---")
								console.log("Site '" + sitename + "' has been prepared.\n")
								console.log("Please create DNS entries, or add to /etc/hosts:");
								console.log("127.0.0.1     " + hostname);
								console.log("Also check index.js and config.json to fine-tune extra parameters, encryption key, ...");
								console.log("---")
								console.log("Start your site using:");
								console.log("$ forever start " + sitename + ".js");
								console.log("    or");
								console.log("$ node " + sitename + ".js");
								console.log("-");
								console.log("surf to http://localhost:"+siteport);
								console.log("    or manage your site at");
								console.log("http://localhost:"+siteport+"/"+language+"/dashboard");
								con.end();
								rl.close();
							  });
							});
						});
					  });
					});
				  });
				});
			  });
			});
        });
      });
    });
  });
});

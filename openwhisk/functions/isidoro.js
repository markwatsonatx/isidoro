// $DefaultParam:cloudantUsername
// $DefaultParam:cloudantPassword
// $DefaultParam:cloudantAccount
// $DefaultParam:cloudantUrl

function main(params) {
    const ADD = 'add';
    const REMOVE = 'remove';
    const GET = 'get';
	return new Promise((resolve, reject) => {
        let cloudant = require('cloudant');
        let db = cloudant({
            username: params.cloudantUsername,
            password: params.cloudantPassword,
            account: params.cloudantAccount,
            url: params.cloudantUrl
        });
        if (!params.message.body || !params.message.from) {
            return resolve({ message: 'Invalid message' });
        }
        else {
            let operation;
            let idea = '';
            let body = params.message.body;
            let bodyLower = body.toLowerCase();
            if (bodyLower.indexOf(ADD) == 0) {
                operation = ADD;
                idea = body.substring(ADD.length + 1);
            }
            else if (bodyLower.indexOf(REMOVE) == 0) {
                operation = REMOVE;
                idea = body.substring(REMOVE.length + 1);
            }
            else if (bodyLower.indexOf(GET) == 0) {
                operation = GET;
            }
            if (!operation) {
                return resolve({message: 'Invalid operation. Send \'get\', \'add\', or \'remove\'.'});
            }
            // get the idea list from Cloudant for the phone number passed in
			// create it if it doesn't exist
            let response;
            loadOrCreateIdeaList(db, params.message.from, function (err, ideaList) {
                if (err) {
					return resolve({message: 'Oops! Something went wrong. Please try again later. Sorry!: ' + err});
                }
                if (operation == ADD || operation == REMOVE) {
                    let ideaIndex = -1;
                    let ideaLower = idea.toLowerCase();
                    for (var i=0; i<ideaList.ideas.length; i++) {
                        if (ideaList.ideas[i].toLowerCase() == ideaLower) {
                            ideaIndex = i;
                            break;
                        }
                    }
                    if (operation == REMOVE) {
                        if (ideaIndex >= 0) {
                            ideaList.ideas.splice(ideaIndex, 1);
                            response = 'Idea removed.';
                        }
                        else {
                            response = 'Idea does not exist.';
                        }
                    }
                    else {
                        if (ideaIndex == -1) {
                            ideaList.ideas.push(idea);
                            response = 'Idea added.';
                        }
                        else {
                            response = 'Idea already exists.';
                        }
                    }
                }
                else {
                    response = 'Your Ideas:\n';
                    for (var i=0; i<ideaList.ideas.length; i++) {
                        if (i != 0) {
                            response += '\n';
                        }
                        response += ((i+1) + '. ');
                        response += ideaList.ideas[i];
                    }
                }
                saveIdeaList(db, ideaList, function (err, ideaList) {
                    if (err) {
                        return resolve({message: 'Oops! Something went wrong. Please try again later. Sorry!'});
                    }
                    let message = {
                        from: params.message.from,
                        body: params.message.body,
                        date: new Date().getTime(),
                        operation: operation,
                        idea: idea
                    };
                    saveMessage(db, message, function (err, result) {
                        if (err) {
                            return resolve({message: 'Oops! Something went wrong. Please try again later. Sorry!'});
                        }
                        return resolve({message: response});
                    });
                });
            });
        }
    });
}

function loadOrCreateIdeaList(cloudant, id, callback) {
	let ideasDb = cloudant.use('isidoro_ideas');
	ideasDb.get(id, { include_docs: true }, function (err, result) {
		if (err && err.statusCode != 404) {
            callback(err, result);
        }
        else if (result) {
			callback(err, result);
        }
        else {
			ideaList = {
				_id: id,
                ideas: [],
				create_date: new Date().getTime()
			};
			saveIdeaList(cloudant, ideaList, callback);
        }
    });
}

function saveIdeaList(cloudant, ideaList, callback) {
	let ideasDb = cloudant.use('isidoro_ideas');
	ideasDb.insert(ideaList, function (err, result) {
        if (err) {
			callback(err, result);
        }
        else {
            ideaList._id = result.id;
            ideaList._rev = result.rev;
            callback(err, ideaList);
        }
    });
}

function saveMessage(cloudant, message, callback) {
	let messagesDb = cloudant.use('isidoro_messages');
	messagesDb.insert(message, function (err, result) {
        if (err) {
			callback(err, result);
        }
        else {
            message._id = result.id;
            message._rev = result.rev;
            callback(err, message);
        }
    });
}
const problemModel = require('../models/problemModel');

// get all problem
const getProblems = function(){

	// use Promise to handle asynchronous call
	return new Promise((resolve, reject) => {
		problemModel.find({}, (err, problems) => {
			if(err){
				reject(err);
			} else {
				resolve(problems);
			}
		});
	});
};

//get one problem
const getProblem = function(id){
	return new Promise((resolve, reject) => {
		problemModel.findOne({id: id}, (err, problem) => {
			if(err){
				reject(err);
			} else {
				resolve(problem);
			}
		});
	});
};

//add problem
const addProblem = function(newProblem){
	// return new Promise((resolve,reject) => {
	// 	//if the problem already exists
	// 	if(problems.find(problem => problem.name === newProblem.name)){
	// 		reject('Problem already exists');
	// 	} else{
	// 		newProblem.id = problems.length + 1;
	// 		problems.push(newProblem);
	// 		resolve(newProblem);
	// 	}
	// })

	return new Promise((resolve, reject) => {
		//check if the problem already exists
		problemModel.findOne({name: newProblem.name}, (err, data) => {
			if(data) {
				reject('Problem already exists');
			} else {
				//save to mongodb
				problemModel.count({}, (err, count) => {
					newProblem.id = count + 1;
					const mongoProblem = new problemModel(newProblem);
					mongoProblem.save();
					resolve(mongoProblem);
				})
			}
		})
	})
};

module.exports = {
	getProblems,
	getProblem,
	addProblem
}
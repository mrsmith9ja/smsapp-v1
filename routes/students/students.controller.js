/*jshint esversion: 6 */
var express = require('express');
var gravatar = require('gravatar');
var router = express.Router();
var roleChecker = require('../../modules/role-check.js');
var studentService = require('../../services/student.service.js');
var userService = require('../../services/user.service.js');
var parentService = require('../../services/parent.service.js');

var returnRouter = function(parse){
	var Parse = parse;
	// Get all students
	router.get('/', getAllStudents);
	router.put('/', toggleStudentActivation);
	router.get('/:studentId', getStudent);
	router.put('/:studentId/unlink', removeLink);
	router.post('/:studentId/:parentId', linkParent);
	router.get('/:studentId/attendance', getStudentAttendance);
	router.get('/:studentId/work', getStudentClassWork);
	router.get('/:studentId/timetable', getStudentTimeTable);
	router.put('/parent', toggleParentActivation);
	router.get('/parent/:id', getStudentParent);
	router.get('/parents/:q', searchParent);

	return router;
}
module.exports = returnRouter;

function searchParent(req, res) {
	var q = req.params.q;
	var _token = req.session.user.sessionToken;
	parentService.searchParent(_token, q).then((parents) =>{
		// console.log("The parents", parents);
		if (!parents.result) {
			res.status(404).send({errorCode:404, message: 'No parent found'});
			return;
		}
		res.send(parents.result);
	}).catch((error) =>{
		res.status(501).send({errorCode:501, message: 'An error occurred while searching for parents'});
	})
}

function linkParent(req, res) {
	var parentId = req.params.parentId;
	var studentId = req.params.studentId;
	var _token = req.session.user.sessionToken;

	studentService.linkParentToStudent(_token, studentId, parentId).then((student) =>{
		res.send(student.result);
	}).catch((error) =>{
		res.status(500).send(error);
	});
}

function removeLink(req, res) {
	var studentId = req.params.studentId;
	var _token = req.session.user.sessionToken;
	var f = {
		'profile':{
			'__op':'Delete'
		}
	};
	userService.updateUser(_token, studentId, f).then((user) =>{
		res.send({message:"Unlinked!"});
	}).catch((error) =>{
		res.status(500).send({message:"An error occurred."});
	});
}

function getStudentParent(req, res) {
	var parentId = req.params.id;
	studentService.getStudentParentByParentId(req.session.user.sessionToken,
		parentId).then((parent) => {
		if (!JSON.parse(parent).results[0]) {
			res.status(404).send({errorCode:404, message:'Parent not found.'});
			return;
		}
		res.send(JSON.parse(parent).results[0]);
	}).catch((error) =>{
		res.status(501).send({errorCode:500, message:'An error occurred.'});
	});
}

function toggleParentActivation(req, res) {
	var _parent = req.body;
	var _token = req.session.user.sessionToken;
	var f = {
		'isActive':_parent.isActive,
		'role':'parent',
		'profile':{
			'__op':'Delete'
		}
	};
	userService.updateUser(_token, _parent.objectId, f).then((parent) =>{
		res.status(204).send({message:"Activated."});
	}).catch((error) =>{
		res.status(501).send({errorCode:501, message:'An error occurred.'});
	});
}

function toggleStudentActivation(req, res) {
	userService.toggleUserActivation(
		req.session.user.sessionToken, 
		req.body.objectId, 
		req.body.isActive).then((user) => {
			if (user.code == 206) {
				res.status(500).send(user);	
				return;
			}
			console.log(user);
			res.send(user);
		}).catch((error) => {
			res.status(500).send({errorCode:500, message:'An error occurred.'});
		});
}

function getAllStudents(req, res) {
	studentService.getStudents(req.session.user.sessionToken, 0).then((students) =>{
		res.status(200).send(students);
	}).catch((error) =>{
		res.send(401).send(error);
	});
}

function getStudent(req, res) {
	var id = req.params.studentId;
	var currentUser = req.session.user;
	var imgUrl = gravatar.url(currentUser.email, {s: '200', r: 'pg', d: 'retro'});
	res.render('student/index',{
			pageTitle: "School Management System",
			action: "records",
			isAuthenticated: true,
			user: currentUser,
			gravatar: imgUrl
		});
}

function getStudentAttendance(req, res) {
	var id = req.params.studentId;
	res.status(200).send("Hello "+id+". Attendance!");
}

function getStudentClassWork(req, res) {
	var id = req.params.studentId;
	res.status(200).send("Hello "+id+". Class work!");
}

function getStudentTimeTable(req, res) {
	var id = req.params.studentId;
	res.status(200).send("Hello "+id+". Time Table!");
}

function noStudent(req, res, next) {
	if (roleChecker.isStudent(req.user)) {
		res.redirect('/home/noPermission');
	} else {
		next();
	}
}
// backend/controllers/curriculum.controller.js
import * as curriculumService from '../services/curriculum.service.js';
import { handleServiceError } from '../utils/errors.js';

export const listSubjects = async (req, res) => {
  try {
    const data = await curriculumService.listSubjects({ user: req.user, query: req.query });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list subjects');
  }
};

export const getSubject = async (req, res) => {
  try {
    const data = await curriculumService.getSubject({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load subject');
  }
};

export const createSubject = async (req, res) => {
  try {
    const data = await curriculumService.createSubject({ user: req.user, body: req.body });
    res.status(201).json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create subject');
  }
};

export const updateSubject = async (req, res) => {
  try {
    const data = await curriculumService.updateSubject({ user: req.user, params: req.params, body: req.body });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update subject');
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const data = await curriculumService.deleteSubject({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete subject');
  }
};

export const listChapters = async (req, res) => {
  try {
    const data = await curriculumService.listChapters({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list chapters');
  }
};

export const getChapter = async (req, res) => {
  try {
    const data = await curriculumService.getChapter({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load chapter');
  }
};

export const createChapter = async (req, res) => {
  try {
    const data = await curriculumService.createChapter({ user: req.user, params: req.params, body: req.body });
    res.status(201).json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create chapter');
  }
};

export const updateChapter = async (req, res) => {
  try {
    const data = await curriculumService.updateChapter({ user: req.user, params: req.params, body: req.body });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update chapter');
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const data = await curriculumService.deleteChapter({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete chapter');
  }
};

export const listTopics = async (req, res) => {
  try {
    const data = await curriculumService.listTopics({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to list topics');
  }
};

export const getTopic = async (req, res) => {
  try {
    const data = await curriculumService.getTopic({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to load topic');
  }
};

export const createTopic = async (req, res) => {
  try {
    const data = await curriculumService.createTopic({ user: req.user, params: req.params, body: req.body });
    res.status(201).json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to create topic');
  }
};

export const updateTopic = async (req, res) => {
  try {
    const data = await curriculumService.updateTopic({ user: req.user, params: req.params, body: req.body });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to update topic');
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const data = await curriculumService.deleteTopic({ user: req.user, params: req.params });
    res.json(data);
  } catch (err) {
    handleServiceError(res, err, 'Failed to delete topic');
  }
};

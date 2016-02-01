import config from 'config';
import fs from 'fs';
import sys from 'sys';
import { exec } from 'child_process';
import * as express from 'express';

var router = express.Router();

router.post('/upload', (req, res) => {
    console.log(JSON.stringify(req.body, null, 2));
});

export default router;
export { router };

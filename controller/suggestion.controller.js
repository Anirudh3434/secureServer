
import oracledb from 'oracledb';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suggestion = async (req, res) => {
  const { emp_id } = req.body;

  if (!emp_id) {
    return res.status(400).json({
      access: false,
      error: 'Missing employer ID (emp_id)',
    });
  }

  let connection;

  try {
    connection = await oracledb.getConnection({
      user: 'canwinn',
      password: 's2sdcP097[{',
      connectString: '140.238.227.9:1521/dev_pdb1',
    });

    // Fetch user and job data
    const userResult = await connection.execute(`
      SELECT 
        ubd.USER_ID, 
        ubd.EXPERIENCE_IN_YEAR, 
        upd.CURRENTJOBROLE, 
        upd.CURRENTINDUSTRY, 
        us.SKILLNAME
      FROM USER_BASIC_DETAIL ubd
      LEFT JOIN USER_PROFESSIONAL_DETAIL upd ON ubd.USER_ID = upd.USER_ID
      LEFT JOIN USER_EMPLOYMENT_DETAIL ued ON ubd.USER_ID = ued.USER_ID 
      LEFT JOIN USER_SKILLS us ON ubd.USER_ID = us.USER_ID
      
    `);

    const jobResult = await connection.execute(
      `
      SELECT 
        J.JOB_ID, 
        J.JOB_TITLE, 
        J.JOB_DESCRIPTION, 
        J.MIN_EXPERIENCE, 
        J.JOB_SKILLS,     
        E.USER_ID
      FROM 
        JOBS J
      JOIN 
        EMPLOYERS E ON J.EMPLOYER_ID = E.EMPLOYER_ID
      WHERE 
        E.USER_ID = :emp_id
    `,
      [emp_id]
    );

    const data = {
      users: userResult.rows,
      jobs: jobResult.rows,
    };

    console.log(data.users)

    const python = spawn('python3', ['utils/job_match.py']);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          access: false,
          error: 'Python script execution failed',
          details: errorOutput,
        });
      }

      try {
        const suggestions = JSON.parse(output);
        return res.status(200).json({
          access: true,
          message: 'Suggestions fetched successfully',
          data: suggestions,
        });
      } catch (parseErr) {
        return res.status(500).json({
          access: false,
          error: 'Invalid JSON from Python script',
          details: parseErr.message,
        });
      }
    });

    // Send JSON to Python via stdin
    python.stdin.write(JSON.stringify(data));
    python.stdin.end();

  } catch (err) {
    return res.status(500).json({
      access: false,
      error: 'Database error',
      details: err.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}


const searchCandidate = async (req, res) => {
  const filter = req.body;

  if (!filter) {
    return res.status(400).json({ access: false, error: 'Missing filter' });
  }

  try {
    // Connect to Oracle
    const connection = await oracledb.getConnection({
      user: "canwinn",
      password: "s2sdcP097[{",
      connectionString: "140.238.227.9:1521/dev_pdb1"
    });

    const result = await connection.execute(`
      SELECT 
        ubd.USER_ID, u.ROLE_ID, ubd.EXPERIENCE_IN_YEAR, ubd.CURRENTCOUNTRY,
        ubd.CURRENTSTATE, upd.CURRENTJOBROLE, upd.CURRENTINDUSTRY,
        us.SKILLNAME, ucp.SALARYEXPECTATION, uprd.GENDER
      FROM CANWINN_USERS u
      LEFT JOIN USER_BASIC_DETAIL ubd ON u.USER_ID = ubd.USER_ID
      LEFT JOIN USER_PROFESSIONAL_DETAIL upd ON u.USER_ID = upd.USER_ID
      LEFT JOIN USER_PERSONAL_DETAIL uprd ON u.USER_ID = uprd.USER_ID           
      LEFT JOIN USER_EMPLOYMENT_DETAIL ued ON u.USER_ID = ued.USER_ID 
      LEFT JOIN USER_CAREER_PREFERENCES ucp ON u.USER_ID = ucp.USER_ID
      LEFT JOIN USER_SKILLS us ON u.USER_ID = us.USER_ID
      WHERE u.ROLE_ID != 2
    `);

    await connection.close();

    const userRows = result.rows || [];
    const candidates = userRows.map(row => ({
      user_id: row[0],
      role_id: row[1],
      experience: row[2] || '',
      country: row[3] || '',
      state: row[4] || '',
      role: row[5] || '',
      industry: row[6] || '',
      skill: row[7] || '',
      salary: row[8] || '',
      gender: row[9] || ''
    }));

    // Prepare input JSON for Python
    const payload = JSON.stringify({ filter, candidates });

    // Spawn Python process
    const py = spawn('python3', [path.resolve('utils/search_candidate.py')]);

    let output = '';
    let errorOutput = '';

    py.stdout.on('data', (data) => {
      output += data.toString();
    });

    py.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          access: false,
          error: 'Python script failed',
          details: errorOutput
        });
      }

      try {
        const parsed = JSON.parse(output);
        return res.status(200).json({
          access: true,
          message: 'Matches fetched successfully',
          data: parsed.filter(p => p.score * 100 > 5)
        });
      } catch (err) {
        return res.status(500).json({
          access: false,
          error: 'Invalid JSON from Python',
          details: err.message
        });
      }
    });

    // Write data to Python stdin
    py.stdin.write(payload);
    py.stdin.end();

  } catch (err) {
    return res.status(500).json({
      access: false,
      error: 'Oracle DB error',
      details: err.message
    });
  }
};

    
export {suggestion , searchCandidate };

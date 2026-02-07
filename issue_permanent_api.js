const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in in correct node version
// If node-fetch isn't available, we'll use http
const http = require('http');

const data = JSON.stringify({
    studentName: 'Permanent User',
    rollNumber: 'PERM-2025',
    courseName: 'System Persistence Specialist',
    university: 'Blockchain Core System',
    department: 'Infrastructure',
    year: '2025',
    grade: 'A+',
    cgpa: '10.0',
    requestOnly: false // Direct issue
});

// We need a student ID first. Let's hijack the test student.
// Actually, let's login as admin first to get a token.

const adminLogin = JSON.stringify({
    email: 'admin@gmail.com',
    password: 'password123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': adminLogin.length
    }
};

const reqLogin = http.request(loginOptions, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const authData = JSON.parse(body);
            const token = authData.token;
            console.log('Got Admin Token');
            
            // Now get a student ID
            const optionsStudents = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/students',
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token }
            };

            http.get(optionsStudents, resStd => {
                let stdBody = '';
                resStd.on('data', d => stdBody += d);
                resStd.on('end', () => {
                    const students = JSON.parse(stdBody);
                    if (students.length > 0) {
                        const studentId = students[0]._id;
                        console.log('Using Student ID:', studentId);

                        // Issue Certificate
                        const issueData = JSON.stringify({
                            studentId: studentId,
                            studentName: 'Permanent User',
                            rollNumber: 'PERM-2025',
                            courseName: 'Lifetime Access',
                            university: 'IEEE Xpert Global',
                            department: 'Core',
                            year: '2099',
                            grade: 'O',
                            cgpa: '10.0',
                            requestOnly: false
                        });

                        const issueOptions = {
                            hostname: 'localhost',
                            port: 5000,
                            path: '/api/certificates/issue',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': issueData.length,
                                'Authorization': 'Bearer ' + token
                            }
                        };

                        const reqIssue = http.request(issueOptions, resIssue => {
                            let issueResBody = '';
                            resIssue.on('data', d => issueResBody += d);
                            resIssue.on('end', () => {
                                console.log('Issue Response:', issueResBody);
                            });
                        });
                        reqIssue.write(issueData);
                        reqIssue.end();
                    }
                });
            });
        } else {
            console.error('Login Failed:', body);
        }
    });
});

reqLogin.write(adminLogin);
reqLogin.end();

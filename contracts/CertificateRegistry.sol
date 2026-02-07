// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {
    address public owner;

    struct Certificate {
        string certificateId;
        string rollNumber;
        string department;
        string studentName;
        string courseName;
        string university;
        uint256 issueDate;
        bytes32 ipfsHash;
        bool isRevoked;
    }

    mapping(string => Certificate) private certificates;
    mapping(string => bool) private certificateExists;

    event CertificateIssued(string certificateId, string studentName, uint256 issueDate);
    event CertificateRevoked(string certificateId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function issueCertificate(
        string memory _certificateId,
        string memory _rollNumber,
        string memory _department,
        string memory _studentName,
        string memory _courseName,
        string memory _university,
        bytes32 _ipfsHash
    ) public onlyOwner {
        require(!certificateExists[_certificateId], "Certificate ID already exists");

        certificates[_certificateId] = Certificate({
            certificateId: _certificateId,
            rollNumber: _rollNumber,
            department: _department,
            studentName: _studentName,
            courseName: _courseName,
            university: _university,
            issueDate: block.timestamp,
            ipfsHash: _ipfsHash,
            isRevoked: false
        });

        certificateExists[_certificateId] = true;
        emit CertificateIssued(_certificateId, _studentName, block.timestamp);
    }

    function verifyCertificate(string memory _certificateId) 
        public 
        view 
        returns (
            string memory rollNumber,
            string memory department,
            string memory studentName,
            string memory courseName,
            string memory university,
            uint256 issueDate,
            bool isRevoked
        ) 
    {
        require(certificateExists[_certificateId], "Certificate does not exist");
        Certificate memory cert = certificates[_certificateId];
        return (cert.rollNumber, cert.department, cert.studentName, cert.courseName, cert.university, cert.issueDate, cert.isRevoked);
    }

    function revokeCertificate(string memory _certificateId) public onlyOwner {
        require(certificateExists[_certificateId], "Certificate does not exist");
        certificates[_certificateId].isRevoked = true;
        emit CertificateRevoked(_certificateId);
    }
}

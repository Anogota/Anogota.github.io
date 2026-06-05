K8s-Runtime-Security
Learning Objectives

Understand Kubernetes Auditing and how it can be used to trace and troubleshoot security events

Understand the various problems and solutions surrounding runtime security in Kubernetes

Understand Falco, how it works and how it can be used in a Kubernetes cluster for real-time threat detection

Understand the importance of end-to-end monitoring and how other tools can work along with Falco to achieve this

1.Kubernetes Auditing
Task 1:In which request stage will the response headers have been sent out but not the response body? ResponseStarted: This is when the response headers have been sent out, but the response body hasn't. This stage will only be present for long-running requests such as “wait” (a Kubernetes command you can use to wait for a condition to be met, such as the running status of a resource).

Task 2:Which level will capture the most data? RequestResponse - This tells Kubernetes to log the request metadata, request body and response body.

Task 3:What field must be contained in an audit policy for it to be valid? rule field must be contained in an audit policy for it to be valid

Task 4:At what level is it recommended to log sensitive resources (like secrets)? For sensitive resources (anything containing security-sensitive information, such as secrets or config maps), log only at the Metadata level; otherwise, the sensitive information will be included in the audit log.

2.Runtime Security & K8s
Task 1:What percentage of containers live less than 5 minutes in 2024 according to the annual report provided in this task? When check by annual report below, the answer will be: 70

<img width="200" height="200" alt="image" src="https://github.com/user-attachments/assets/eaba7e7d-be5a-4c77-ba96-54ef5bc00c7e" />

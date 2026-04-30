# Project Grading

Project grading consists of three separate grades: an aggregated team grade, a team final grade, and an individual oral examination. These are weighted as follows: 40% aggregated team grade, 30% team final presentation, and 30% individual oral examination.

The team final presentation and individual oral examination are both conducted at the end of the semester. The aggregated team grade is based on three evaluations carried out during the semester, approximately one per month.

---

# Individual oral examination (30%)

The individual oral examination is the sole individual grading which serves as the main mechanism for assessing each student's personal contribution and understanding. It is conducted at the end of the semester by a pair of tutors.

In this examination, each student presents one artefact of their choice that they personally developed within the project. Assumingly, the selected artefact represents the strongest example of the student's work, and the evaluation can therefore be based on how well the student is able to explain, justify, and defend it. The artefact should correspond to the student's declared responsibility area. Depending on the project, this may include a CI/CD pipeline, a monitoring setup, a deployment configuration, a Docker-based environment, a testing setup, a service implementation, a logging or alerting mechanism, or an infrastructure-as-code component.

Each student is given a 15-minute slot and is assessed using prepared questions. During the examination, the student first explains the chosen artefact, its function, and its design decisions, and then answers technical questions. We would verify ownership, depth of understanding, technical correctness, and the student's ability to explain how their work fits into the overall system. It also provides a basis for judging code quality, the significance and difficulty of the contribution, and the student's understanding of collaboration within the team.

During the examination, you are expected to:

- explain your subsystem and its role in the overall system
- describe technical decisions you made
- demonstrate understanding of how your component integrates with others

Your contribution will be evaluated based on your work during the project, which includes:

- code quality (clarity, structure, maintainability)
- contribution (balance between difficulty and quantity of work)
- collaboration (participation in reviews, integration, and team work)

---

# Team aggregated grade (40%)

The team aggregated grade reflects how the team works over the course of the semester. It is based on three checkpoint evaluations, one per month, carried out by the tutor. The aggregated grade ensures that work is done throughout the semester and avoids situations where everything is done at the last minute. It also prevent unfair situations, in which a student who worked the whole semester gets the same grade as someone who did everything one week before submission. This grade captures how the project develops over time and how consistently the team is able to organise and carry it forward. The final team aggregated grade is derived from these intermediate evaluations.

This component is intended to assess whether the team is managing the project in a structured and reliable way. The main questions are whether the team plans and distributes work clearly, makes steady progress, integrates the technical parts of the system properly, reacts to feedback, and collaborates effectively as a group. You expected to receive a guidance on any risks and problems observed, and being suggested concrete steps for improvement. In this way, the aggregated grade also serves as a mechanism for guidance during the semester.

> ❗ You will receive your intermediate grade from your tutor after each evaluation. That will allow you to understand your strength and weaknesses, and to work on it.

The next parameters are evaluated during each iteration:

- Planning and task distribution
- Progress since last evaluation
- Technical integration
- Collaboration and communication
- Responsiveness to feedback
- Risks and problems occurring during the project execution and how they were handled

It is expected that tutors can interact with a running version of your system without requiring additional setup. This means that your deployment must be stable, accessible, and reflect the final state of your project.

This requires:

- a deployed instance available via URL (on course infrastructure or cloud)
- a working system that reflects the final submission
- clear instructions on how to access and use the system
- no reliance on local-only setups for evaluation

---

# Team final presentation (30%)

The team final presentation and demonstration is the main end-of-semester assessment of the project as a whole. It is evaluated jointly by tutors and instructors. During this evaluation, the focus is on how well the system works as a complete and integrated solution.

The team is expected to present the overall goal and scope of the project clearly, explain the architecture and DevOps pipeline, and justify the main engineering decisions they made. They should also show that they understand the trade-offs involved in their solution and can explain why the system was designed in that way.

An important part of this assessment is the demonstration itself. The team should show that the system actually works, that the main workflow can be followed clearly, and that the operational aspects of the project are visible where relevant. This may include deployment, monitoring, testing, and other supporting infrastructure. In other words, this component evaluates both how well the team can explain the project and how well the project works in practice.

---

# Project Grading Criteria

The project is graded across the categories presented below. The table serves as a visual example, highlighting different aspects of the project which will be graded, as well as what you should pay attention to during project execution. The exact evaluation may differ depending on the judgement of the person evaluating it. The ability to answer technical questions, clarify your own part of the work, and present it clearly is also taken into account.

**The project is graded as failed if:**

- Contributions are not transparently documented (Artemis + Confluence)
- Team members cannot clearly explain their own subsystem during the presentation
- No working end-to-end system is demonstrated

## System

| Category             | Evaluation | Explanation                                                                                             |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| Functional System    | Excellent  | Full end-to-end system works reliably across all components; no major failures                          |
|                      | Good       | Core functionality works; minor issues in integration or edge cases                                     |
|                      | Basic      | Partial functionality; several components not fully integrated                                          |
|                      | Poor       | System does not function as a coherent whole                                                            |
| Architecture Quality | Excellent  | Clear modular structure; components/services well-separated with defined interfaces                     |
|                      | Good       | Mostly modular; interfaces exist but inconsistencies present                                            |
|                      | Basic      | Limited structure; tight coupling between components                                                    |
|                      | Poor       | No clear architecture or structure                                                                      |
| User-Facing Value    | Excellent  | System provides clear user workflows; functionality solves a meaningful problem; UI supports usage well |
|                      | Good       | Functionality usable but limited or partially unclear                                                   |
|                      | Basic      | Minimal functionality; usability issues present                                                         |
|                      | Poor       | No meaningful user-facing functionality                                                                 |

## DevOps & Infrastructure

| Category                        | Evaluation | Explanation                                                                                                                     |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Build and Deployment            | Excellent  | Fully automated CI/CD: build, test, image creation, and deployment work reliably                                                |
|                                 | Good       | CI automated (build + test); deployment partially automated or unstable                                                         |
|                                 | Basic      | Partial automation (only build or test); deployment manual                                                                      |
|                                 | Poor       | No functional CI/CD pipeline                                                                                                    |
| Runtime and Observability       | Excellent  | Metrics reflect system behaviour (e.g. latency, errors, load); dashboards clearly visualise system state; alerts are meaningful |
|                                 | Good       | Metrics and dashboards exist but limited coverage or unclear interpretation                                                     |
|                                 | Basic      | Basic monitoring setup present but not useful for understanding system behaviour                                                |
|                                 | Poor       | No meaningful observability setup                                                                                               |
| Environment and Reproducibility | Excellent  | System fully containerised; local setup reproducible with minimal steps and no manual fixes                                     |
|                                 | Good       | Mostly reproducible; minor setup issues or manual steps required                                                                |
|                                 | Basic      | Setup works but requires significant manual intervention                                                                        |
|                                 | Poor       | System cannot be reliably set up locally                                                                                        |

## Engineering Process

| Category              | Evaluation | Explanation                                                                                    |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Testing Strategy      | Excellent  | Tests cover critical flows, edge cases, and failures; integrated into CI                       |
|                       | Good       | Tests cover main functionality; limited edge case coverage                                     |
|                       | Basic      | Few tests; limited relevance to system behaviour                                               |
|                       | Poor       | No meaningful testing                                                                          |
| Engineering Artefacts | Excellent  | Architecture and system design clearly documented and consistent with implementation           |
|                       | Good       | Documentation exists but incomplete or partially inconsistent                                  |
|                       | Basic      | Minimal documentation; unclear structure                                                       |
|                       | Poor       | No useful engineering artefacts                                                                |
| Documentation         | Excellent  | Documentation enables full setup, usage, and understanding; responsibilities clearly traceable |
|                       | Good       | Documentation usable but incomplete                                                            |
|                       | Basic      | Limited documentation; unclear instructions                                                    |
|                       | Poor       | No usable documentation                                                                        |

---

# Bonus

For exceptional additional technical characteristics of the project, additional credit may be given by the evaluator. These are awarded for technical extensions beyond baseline requirements. Depending on the quality of execution, recognition may vary.

| Level                             | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| Advanced DevOps                   | e.g. autoscaling, self-healing, advanced deployment strategies |
| Advanced Observability            | e.g. tracing, log aggregation, custom metrics                  |
| Advanced AI                       | e.g. RAG pipeline, vector database integration                 |
| System Excellence                 | clearly above baseline in design or implementation             |
| Additional justified improvements | technically meaningful extensions                              |

Additional consideration may be given in cases where the team is not full (e.g. two or one member). Since the grading structure is designed for full teams, adjustments may be made to reflect the workload in such cases.


---

## Test Request Gantt Scheduler
**Context**: Replaced simple status tracking with a fully fledged, task-based laboratory execution pipeline to improve resource planning. Let's see how the app looks with the task scheduling Gantt tool inside the Test Request list.

**Changes Made**:
- **Database Schema**: Created new `lab_technicians` and `test_tasks` relationships in Supabase, assigning RLS policies correctly.
- **Task Types & Storage**: Brought relational fetching using Zustand to map the assignee IDs to proper models dynamically within the Redux-like scope.
- **Feature Modules**:
  - Inserted the `LabTechnicianManager` configuration into application `Settings`. 
  - Attached the Gantt UI to the Test Requests view, injecting a sliding modal to visualize execution tasks along a customized grid.
  - Linked dependent tasks (`depends_on_task_id`) to enforce procedural sequencing (Preparation -> Routing -> Testing).

**Verification Results**: Successfully interacted via the built-in browser using `demo@aerosuite.dev`. Added Lab Technicians, transitioned Request statuses to `Specimen Preparation`, assigned hours to tasks, bounded constraints to previous tasks, and verified visual timeline positioning.

> [!TIP]
> Drag-and-drop handles for Gantt bars can be implemented in a subsequent phase by calculating pixel delta relative to the starting timeline frame (`timelineInfo.earliestDate`). 

### Showcase

````carousel
![Gantt Timeline Visualization (Browser Capture)](file:///Users/Beni/.gemini/antigravity/brain/519585d3-6494-4873-8890-d105928a6b97/final_scheduler_ui_1772912259122.png)
<!-- slide -->
![Browser Recording: Gantt Scheduling Integration Demo](file:///Users/Beni/.gemini/antigravity/brain/519585d3-6494-4873-8890-d105928a6b97/test_request_workflow_fixed_1772910590230.webp)
````

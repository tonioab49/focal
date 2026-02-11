### Scenario 1: The "Autonomous PR" Flywheel

**The Problem:** In Linear/Jira, a bug report is just text in a database. An engineer has to read it, open their IDE, find the code, and fix it.**The Focal Moment:**

1.  You are in a meeting and notice a UI bug. You open Focal and create a task: FOC-105: Fix mobile nav overlap.
    
2.  The **Focal Server** commits .focal/tasks/FOC-105.md to your repo.
    
3.  An **Autonomous Agent** (watching the repo) sees the commit, checks out a new branch, and uses the task's context to find the offending CSS.
    
4.  Before the meeting is even over, Focal moves the card to **"In Review"** and pings you with a link to a generated Pull Request.**The Difference:** You didn't just report a bug; you triggered a robot that already had the keys to the factory.
    

### Scenario 2: The "Context-Aware" Branch Switch

**The Problem:** You’re deep in a complex refactor on branch-A. A p0 emergency forces you to switch to branch-B. In Linear, your "Active" tasks are still the ones from branch-A, cluttering your view and mental space.**The Focal Moment:**

1.  You run git checkout p0-emergency-fix.
    
2.  Because your tasks live in the .focal/ directory _on that branch_, your Kanban board **instantly morphs**.
    
3.  All the half-finished refactor tasks from branch-A vanish. Your Focal UI now shows only the tasks and "Decision Logs" relevant to the emergency fix you worked on two days ago.**The Difference:** Your project management state is **atomically linked** to your code state. You have "Save States" for your entire mental roadmap.
    

### Scenario 3: The "Greppable" Decision Audit

**The Problem:** Six months after a project is finished, someone asks: _"Why did we decide to use WebSockets instead of Polling for the brick-wiring logic?"_ You search Slack (too noisy), Jira (comments are fragmented), and Confluence (out of date).**The Focal Moment:**

1.  You run a simple terminal command: grep -r "WebSockets" .focal/archive/.
    
2.  You find the original Task MD. Because it's a Markdown file, you see the **entire narrative**: the original requirement, the AI agent's failed attempts, the human's final decision log, and the **exact Git hashes** of the commits that implemented it.
    
3.  You use git blame on the _documentation_ file itself to see exactly who approved that architectural shift and when.**The Difference:** Documentation isn't a "second-class citizen" that lives in a browser; it's a **version-controlled ledger** of your team's collective intelligence.
    

Adding a piece of text for testing
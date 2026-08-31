---
id: scheduled-jobs-run-inside-the-database
section: Infrastructure & Automation
difficulty: 2
vizKey: db-cron
---

# Run scheduled work where the data lives

> Run scheduled publishing and trash cleanup on hosting cron, or inside the database?

## Context

Two jobs have to run at fixed times without anyone operating them.

The first is scheduled publishing. A post can be given a future publish time, and once that time passes something has to flip it to public.

The second is trash cleanup. Deleted rows are removed for real once their retention deadline passes, which means something has to check periodically whether any row is past it.

Both have to run when no admin has a screen open.

## Considerations

Two options were on the table.

Hosting platforms provide cron. A schedule in a config file makes the platform call a fixed URL at that time. This requires exposing a URL on the internet whose only job is to run the task, which then has to be guarded by a secret since anyone who learns the address can call it. The first version worked this way, on a five-minute schedule.

`pg_cron` runs the function inside the database. No URL is exposed, and the job runs where the data it touches already is. In exchange, an extension has to be enabled, and the schedule lives in the database rather than in the repository, so checking how often something runs means looking at the database.

## Decision

Everything these two jobs touch **already lives inside the database**. HTTP cron opens a door on the outside just to trigger work on the inside, and then adds guarding code to maintain alongside it. Moving the runner to where the data is **removes both the door and that code**.

Both jobs moved to `pg_cron`, and the schedule list in the config file was emptied.

```sql
SELECT cron.schedule(
  'publish-scheduled',
  '* * * * *',
  $cron$ SELECT safe_publish_scheduled(); $cron$
);
```

The middle line is the schedule; five asterisks mean every minute. It went from five minutes to one because publish times are chosen to the minute, and checking every five could leave a post up to five minutes late.

What the schedule runs is not the job function but a `safe_` wrapper around it. If the inner call raises, the wrapper catches it and records the error in `admin_notifications`.

The registration statements `unschedule` before they `schedule`, so re-running the whole setup file never registers the same job twice.

## Key Insight

Driving a scheduled job over HTTP means opening one more door on the internet whose only purpose is to run that job. The door has to be guarded, and the guarding code becomes something else to maintain.

If everything the job touches is already inside the database, running it there is simpler. A door that does not exist needs no guard.

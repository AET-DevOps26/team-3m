---
name: address-pr-comments
description: (Team 3M) Address review comments on the GitHub pull request linked to the current branch. Use this skill whenever the user asks to "address PR feedback", "respond to review comments", "fix PR comments", "handle code review", "resolve PR threads", "work through reviewer feedback", or any phrasing about reacting to reviewer notes on the open pull request for the current branch. Also trigger on casual phrasing like "address the comments", "deal with the PR feedback", "go through the review", or when the user pastes a PR URL and asks to act on its review comments. The skill uses the `gh` CLI to discover the PR, fetch review threads, and reply once each comment has been addressed.
---

# Address PR Comments Skill



## Step 1: Discover the Pull Request

Find the PR attached to the current branch:

```
gh pr view --json number,title,url,headRefName,state,isDraft,baseRefName
```

If `gh pr view` reports no PR, stop and tell the user there is no open pull request for this branch. Do not attempt to guess the PR from `gh pr list`. If the PR `state` is not `OPEN`, confirm with the user before continuing.

Save the PR number — every later command needs it.

## Step 2: Collect All Comment Sources

GitHub stores PR feedback in three separate places. Fetch all of them; missing any source leads to ignored feedback.

1. **Inline review comments** (the threaded comments attached to specific lines of the diff):

   ```
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr>/comments"
   ```

   Each item contains `id`, `path`, `line` (or `original_line`), `body`, `user.login`, `in_reply_to_id`, `diff_hunk`, and `pull_request_review_id`.

2. **Review summaries** (the top-level body submitted with `Approve` / `Request changes` / `Comment` reviews):

   ```
   gh api --paginate "repos/{owner}/{repo}/pulls/<pr>/reviews"
   ```

   Only reviews with a non-empty `body` carry actionable text.

3. **Conversation (issue) comments** (the general discussion below the diff):

   ```
   gh api --paginate "repos/{owner}/{repo}/issues/<pr>/comments"
   ```

Resolve `{owner}/{repo}` from `gh repo view --json nameWithOwner -q .nameWithOwner` rather than parsing remotes.

## Step 3: Filter Out Noise

Skip any comment that is not actionable:

- Comments authored by the current user (`gh api user -q .login`) — replying to your own notes adds clutter.
- Comments authored by bots whose `user.type` is `Bot` (Renovate, Dependabot, CodeRabbit summary posts, GitHub Actions). Only address bot comments if the user explicitly asks.
- Comments that are replies in a thread already containing a reply from the current user — the thread has been touched already.
- Threads marked `isResolved` in the GraphQL `reviewThreads` view. Fetch resolution state with:

  ```
  gh api graphql -f query='
    query($owner:String!,$repo:String!,$pr:Int!){
      repository(owner:$owner,name:$repo){
        pullRequest(number:$pr){
          reviewThreads(first:100){
            nodes{ id isResolved comments(first:1){ nodes{ databaseId } } }
          }
        }
      }
    }' -F owner=<owner> -F repo=<repo> -F pr=<pr>
  ```

  Map `comments.nodes[0].databaseId` back to the inline comments from step 2 and drop any that are in a resolved thread.

After filtering, present the user with a numbered list of the remaining comments — file, line, author, and a one-line excerpt — and ask whether to address all of them or a subset. Never start editing without that confirmation.

## Step 4: Group and Plan

Group the surviving comments by file, then by concern within each file. A reviewer often leaves several comments that point at the same underlying issue; address each issue once with a single edit rather than chasing each comment separately.

For each group, write down (in conversation, not on disk):

- The files and line ranges affected.
- The change the reviewer is asking for, paraphrased.
- The plan for the edit, including any tests that need updating.

If a comment is unclear, contradicts another comment, or asks for a change you disagree with based on the surrounding code, surface it to the user before acting. Do not push back to the reviewer directly without the user's go-ahead.

## Step 5: Make the Changes

Apply edits one concern at a time. For each:

1. Read the file at the referenced line to make sure the comment still applies — the line numbers in inline comments are pinned to the diff at the time of the review and may have shifted.
2. Make the edit with the appropriate tool (Edit/Write), following the repo's coding-style rules.
3. Run the local checks for the affected layer:
   - Client (`client/`): `npm run lint && npm run typecheck` and `npm run build` if structural changes were made.
   - Server (`core/`, other Spring services): `./gradlew spotlessApply` then `./gradlew test` for the affected service. Do not hand-fix formatting — the rule in `AGENTS.md` is to let the formatter handle it.
4. If a test was requested or a behavior change requires one, add it before considering the comment done.

Never batch unrelated edits into a single commit. Each logical concern from the review gets its own commit (see step 7).

## Step 6: Reply to Each Comment

After the change for a thread is in place and verified, reply to that thread so the reviewer sees what was done. Reply on the **original (top-level) comment** of the thread, not on subsequent replies — replying mid-thread creates a parallel thread.

For inline review comments, use the pulls/comments reply endpoint:

```
gh api --method POST \
  "repos/{owner}/{repo}/pulls/<pr>/comments/<comment_id>/replies" \
  -f body="<reply text>"
```

For conversation (issue) comments and for review summaries, post a new issue comment that quotes the relevant excerpt so the context is preserved:

```
gh api --method POST \
  "repos/{owner}/{repo}/issues/<pr>/comments" \
  -f body="<reply text>"
```

Reply guidelines:

- Be concise. One or two sentences. State what was changed and, if non-obvious, why.
- Reference the commit SHA that addresses the comment (`Addressed in <short-sha>.`). The reviewer can click through.
- Do not mention Claude, AI assistance, or this skill. The reply should read as if written by the user.
- If you chose not to do exactly what the reviewer asked (because the user instructed otherwise), explain the alternative briefly and invite the reviewer to push back.
- Never claim something is fixed before the edit is actually committed and pushed.

## Step 7: Commit and Push

Use the `conventional-commit` skill to write each commit message. One commit per logical concern keeps the review history readable. If multiple comments collapsed into a single concern, that is still one commit.

After all edits and commits are in place, push:

```
git push
```

If the branch has diverged (the reviewer pushed during the review), rebase onto the remote head before pushing — do not force-push without checking with the user first.

## Step 8: Summarize

End the turn with a short summary for the user:

- How many threads were addressed and how many were skipped (with reasons for skips).
- The commit SHAs created.
- Any threads where you replied with a question or pushback instead of a code change, so the user knows to watch for the reviewer's response.

Do not mark any threads as resolved. Do not request a re-review on the user's behalf unless they ask for it.

## Failure Modes to Watch For

- **Stale line numbers**: inline comments may point to a line that has moved or no longer exists. Use `original_line` and `diff_hunk` to locate the intended spot, and confirm with the user if the reference is ambiguous.
- **Conflicting reviewers**: two reviewers asking for opposite changes. Surface the conflict; do not pick a side silently.
- **Suggested changes blocks**: GitHub `suggestion` blocks in a comment body (` ```suggestion `) are concrete diffs. Apply them verbatim unless they obviously break the surrounding code, and say so in the reply.
- **Comments on outdated diffs**: `gh` marks these with `position: null`. They may still be relevant; read the surrounding code before deciding to skip.
- **Rate limits**: `gh api` will fail with a 403 if the token is rate-limited. Stop, report the limit, and let the user retry later rather than partial-applying changes.

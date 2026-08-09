import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AppConfig } from "@/server/config";
import type { GitConnector } from "@/server/connectors/contracts";
import type { GitCommitFact } from "@/shared/types/domain";

const execFileAsync = promisify(execFile);

export class LiveGitConnector implements GitConnector {
  private readonly repositoryPath: string;

  constructor(private readonly config: AppConfig) {
    if (!config.env.GIT_REPOSITORY_PATH) throw new Error("Live Git connector requires GIT_REPOSITORY_PATH");
    this.repositoryPath = config.env.GIT_REPOSITORY_PATH;
  }

  private async git(args: string[]) {
    const result = await execFileAsync("git", ["-C", this.repositoryPath, ...args], {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });
    return result.stdout;
  }

  async fetch() {
    await this.git(["fetch", "--all", "--prune"]);
  }

  async getCommitsSince(sha?: string): Promise<GitCommitFact[]> {
    const target = `${this.config.env.GIT_REMOTE}/${this.config.env.GIT_BRANCH}`;
    const range = sha ? `${sha}..${target}` : target;
    const output = await this.git([
      "log",
      range,
      "-n",
      "100",
      "--reverse",
      "--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%cI%x1f%s%x1f%b%x1f%P%x1e"
    ]);
    const commits = output.split("\x1e").map((record) => record.trim()).filter(Boolean);
    return Promise.all(commits.map(async (record) => {
      const [shaValue, authorName, authorEmail, authorDate, committerDate, subject, body, parents] = record.split("\x1f");
      return {
        sha: shaValue,
        repositoryId: "application",
        authorName,
        authorEmail,
        authorDate: new Date(authorDate),
        committerDate: new Date(committerDate),
        subject,
        body,
        parentSha: parents?.split(" ")[0] || undefined,
        changedFiles: await this.changedFiles(shaValue)
      };
    }));
  }

  async getCommit(sha: string) {
    const output = await this.git(["show", "-s", "--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%cI%x1f%s%x1f%b%x1f%P", sha]);
    if (!output.trim()) return undefined;
    const [shaValue, authorName, authorEmail, authorDate, committerDate, subject, body, parents] = output.trim().split("\x1f");
    return {
      sha: shaValue,
      repositoryId: "application",
      authorName,
      authorEmail,
      authorDate: new Date(authorDate),
      committerDate: new Date(committerDate),
      subject,
      body,
      parentSha: parents?.split(" ")[0] || undefined,
      changedFiles: await this.changedFiles(shaValue)
    };
  }

  private async changedFiles(sha: string): Promise<GitCommitFact["changedFiles"]> {
    const output = await this.git(["show", "--format=", "--name-status", "-z", sha]);
    const parts = output.split("\0").map((part) => part.trim()).filter(Boolean);
    const changedFiles: GitCommitFact["changedFiles"] = [];
    for (let index = 0; index < parts.length; index += 2) {
      const rawType = parts[index];
      const path = parts[index + 1];
      if (!rawType || !path) continue;
      const prefix = rawType[0];
      changedFiles.push({
        path,
        changeType: prefix === "A" ? "ADDED" : prefix === "D" ? "DELETED" : prefix === "R" ? "RENAMED" : "MODIFIED"
      });
    }
    return changedFiles;
  }
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { useSearchParams } from "next/navigation";
import { GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default function NewProjectPage() {
  const repo = useSearchParams();

  return (
    <div className="w-full max-w-md mx-auto pt-8">
      <form>
        <Suspense fallback={<>Loading...</>}>
          <FieldGroup>
            <FieldSet>
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>
                    <Link
                      href={`https://github.com/${repo.get("repo")}`}
                      target="_blank"
                    >
                      {repo.get("repo")}
                    </Link>
                  </ItemTitle>
                  <ItemDescription className="flex items-center gap-1">
                    <GitBranchIcon size="16" /> {repo.get("branch")}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm">
                    Action
                  </Button>
                </ItemActions>
              </Item>
              <FieldLegend className="font-bold text-2xl mt-6">
                New Project
              </FieldLegend>
              <FieldDescription>
                Provide project details to deploy your app.
              </FieldDescription>
              <FieldGroup className="space-y-1 mt-2">
                <Field>
                  <FieldLabel htmlFor="project-name">Project Name</FieldLabel>
                  <Input id="project-name" placeholder="Ship-It" required />
                </Field>

                <Field>
                  <FieldLabel htmlFor="framework">Framework</FieldLabel>
                  <Select>
                    <SelectTrigger id="framework">
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nextjs">Next.js</SelectItem>
                      <SelectItem value="react">React</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <FieldSeparator className="" />

                <Field>
                  <FieldLabel htmlFor="root-directory">
                    Root Directory
                  </FieldLabel>
                  <Input id="root-directory" placeholder="./" />
                </Field>
                <FieldSeparator className="" />

                <Field>
                  <FieldLabel htmlFor="build-command">Build Command</FieldLabel>
                  <Input id="build-command" placeholder="npm run build" />
                </Field>

                <Field>
                  <FieldLabel htmlFor="output-directory">
                    Output Directory
                  </FieldLabel>
                  <Input id="output-directory" placeholder="dist" />
                </Field>

                <Field>
                  <FieldLabel htmlFor="install-command">
                    Install Command
                  </FieldLabel>
                  <Input id="install-command" placeholder="npm install" />
                </Field>
              </FieldGroup>
            </FieldSet>
            <FieldSeparator className="" />
            <Field orientation="horizontal" className="">
              <Button type="submit">Create</Button>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Field>
          </FieldGroup>
        </Suspense>
      </form>
    </div>
  );
}

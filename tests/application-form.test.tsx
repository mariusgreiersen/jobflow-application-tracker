import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationForm } from "@/features/applications/application-form";
import { EMPTY_APPLICATION_FORM } from "@/lib/validations/application";

function setup() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(<ApplicationForm defaultValues={EMPTY_APPLICATION_FORM} isEditing={false} onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel, user: userEvent.setup() };
}

describe("ApplicationForm", () => {
  it("shows accessible errors and does not submit when required fields are missing", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(await screen.findByText("Company name is required")).toBeInTheDocument();
    expect(screen.getByText("Job title is required")).toBeInTheDocument();
    expect(screen.getByLabelText(/Company/)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits validated values", async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/Company/), "Northwind Labs");
    await user.type(screen.getByLabelText(/Job title/), "Graduate Software Engineer");
    await user.type(screen.getByLabelText("Location"), "Copenhagen");
    await user.type(screen.getByLabelText("Job posting URL"), "https://example.com/job");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      company: "Northwind Labs",
      jobTitle: "Graduate Software Engineer",
      location: "Copenhagen",
      jobUrl: "https://example.com/job",
      status: "applied",
    });
  });

  it("flags an invalid URL", async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/Company/), "Acme");
    await user.type(screen.getByLabelText(/Job title/), "Engineer");
    await user.type(screen.getByLabelText("Job posting URL"), "acme dot com");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(await screen.findByText(/full URL/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onCancel", async () => {
    const { onCancel, user } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

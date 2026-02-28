"""Chat endpoint for AI-powered spreadsheet assistance."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, get_current_active_superuser
from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["chat"])


class SpreadsheetContext(BaseModel):
    """Context from the spreadsheet to provide to the AI."""

    columns: list[str]
    rows: list[list[Any]]
    selection: dict[str, Any] | None = None  # Selected cells info


class ChatMessage(BaseModel):
    """A single chat message."""

    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    message: str
    context: SpreadsheetContext | None = None
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    response: str
    actions: list[dict[str, Any]] | None = None  # Actions to perform on spreadsheet


def format_spreadsheet_context(context: SpreadsheetContext) -> str:
    """Format spreadsheet context as a string for the AI prompt."""
    if not context:
        return ""

    lines = ["## Current Spreadsheet Data"]
    lines.append(f"**Columns ({len(context.columns)}):** {', '.join(context.columns)}")
    lines.append(f"**Total Rows:** {len(context.rows)}")
    lines.append("")
    lines.append("**Data Preview (first 30 rows):**")
    lines.append("| " + " | ".join(context.columns) + " |")
    lines.append("| " + " | ".join(["---"] * len(context.columns)) + " |")

    for i, row in enumerate(context.rows[:30], 1):  # Limit to 30 rows for readability
        row_str = " | ".join(str(cell) if cell is not None else "" for cell in row)
        lines.append(f"| {row_str} |")

    if len(context.rows) > 30:
        lines.append(f"\n*... and {len(context.rows) - 30} more rows*")

    if context.selection:
        lines.append(f"\n**User Selection:** Rows {context.selection}")

    return "\n".join(lines)


def build_system_prompt(context: SpreadsheetContext | None) -> str:
    """Build the system prompt with spreadsheet context."""
    base_prompt = """You are an expert spreadsheet assistant embedded in a data analysis application. Your role is to help users understand, analyze, and manipulate their spreadsheet data.

## Your Capabilities
1. **Data Analysis**: Calculate sums, averages, find min/max, identify patterns, detect outliers
2. **Data Insights**: Explain what the data shows, identify trends, provide summaries
3. **Calculations**: Perform arithmetic operations on columns/rows, create derived values
4. **Data Operations**: Help users sort, filter, add/remove rows and columns
5. **Problem Solving**: Answer specific questions about the data

## Response Format
Structure your responses as follows:
1. First, provide a brief explanation or answer in plain text
2. If actions are needed, include them in a JSON code block at the END of your response

## How to Respond
- Be direct and actionable. When the user asks a question about their data, answer it using the actual values.
- Show your calculations when doing math (e.g., "Sum of Price column: 999 + 25 + 75 = 1099")
- If the user asks you to modify data, include the action(s) in a JSON code block

## Available Actions
Include actions in a ```json code block as an ARRAY, even for single actions:

```json
[
  {"type": "action_type", ...params}
]
```

Action types:
- Update a cell: {"type": "update_cell", "row": 0, "col": 1, "value": "new value"}
- Add a new row: {"type": "add_row", "data": ["value1", "value2", "value3"]}
  - The data array must have the same number of elements as there are columns
- Add a new column: {"type": "add_column", "name": "NewColumnName", "data": [val1, val2, ...]}
  - The data array should have values for each existing row
- Delete a row: {"type": "delete_row", "row": 0}
- Delete a column: {"type": "delete_column", "col": 0}
- Sort data: {"type": "sort", "column": 0, "order": "asc"}

**Important**: Row and column indices are 0-based (first row = 0, first column = 0).

## Guidelines
- Work with the ACTUAL data provided below
- Give specific answers with real numbers from the data
- Be concise but complete
- ONLY include a JSON code block when you need to perform an action
- Do NOT include empty arrays like `[]` - if no action is needed, just respond with text"""

    if context:
        context_str = format_spreadsheet_context(context)
        return f"{base_prompt}\n\n{context_str}"

    return base_prompt + "\n\n*No spreadsheet data is currently loaded.*"


async def get_ai_response(
    message: str,
    context: SpreadsheetContext | None,
    history: list[ChatMessage],
) -> tuple[str, list[dict[str, Any]] | None]:
    """Get AI response using OpenAI API if available, otherwise use mock."""
    import json

    # Check if OpenAI is configured
    if settings.OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            messages = [{"role": "system", "content": build_system_prompt(context)}]

            # Add conversation history
            for msg in history[-10:]:  # Keep last 10 messages for context
                messages.append({"role": msg.role, "content": msg.content})

            # Add current message
            messages.append({"role": "user", "content": message})

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                max_completion_tokens=1000,
            )

            response_text = response.choices[0].message.content or ""

            # Try to extract actions from the response
            actions = None
            if "```json" in response_text:
                try:
                    json_start = response_text.index("```json") + 7
                    json_end = response_text.index("```", json_start)
                    json_str = response_text[json_start:json_end].strip()
                    parsed = json.loads(json_str)
                    # Handle both single action and array of actions
                    if isinstance(parsed, list):
                        actions = parsed if parsed else None  # Filter empty arrays
                    elif isinstance(parsed, dict):
                        if "actions" in parsed:
                            actions = parsed["actions"] if parsed["actions"] else None
                        elif "type" in parsed:
                            # Single action object
                            actions = [parsed]
                except (ValueError, json.JSONDecodeError) as e:
                    print(f"JSON parse error: {e}")

            return response_text, actions

        except Exception as e:
            # Fall back to mock response on error
            print(f"OpenAI API error: {e}")

    # Mock response when OpenAI is not configured
    return await get_mock_response(message, context)


async def get_mock_response(
    message: str, context: SpreadsheetContext | None
) -> tuple[str, list[dict[str, Any]] | None]:
    """Generate a mock response for demo purposes."""
    import asyncio

    await asyncio.sleep(0.5)  # Simulate API latency

    message_lower = message.lower()

    if context and context.rows:
        num_rows = len(context.rows)
        num_cols = len(context.columns) if context.columns else 0

        if "sum" in message_lower or "total" in message_lower:
            return (
                f"I can see your spreadsheet has {num_rows} rows and {num_cols} columns. "
                f"To calculate a sum, I'd need to know which column you want to sum. "
                f"Your columns are: {', '.join(context.columns)}. "
                "Which column would you like me to sum?",
                None,
            )

        if "analyze" in message_lower or "analysis" in message_lower:
            return (
                f"Here's a quick analysis of your data:\n\n"
                f"- **Total rows**: {num_rows}\n"
                f"- **Columns**: {', '.join(context.columns)}\n"
                f"- **First row**: {context.rows[0] if context.rows else 'N/A'}\n\n"
                "What specific analysis would you like me to perform?",
                None,
            )

        if "sort" in message_lower:
            return (
                f"I can help you sort the data. Your columns are: {', '.join(context.columns)}. "
                "Which column would you like to sort by, and in what order (ascending or descending)?",
                None,
            )

        return (
            f"I can see your spreadsheet with {num_rows} rows and columns: {', '.join(context.columns)}. "
            f"I received your message: \"{message}\". "
            "To enable full AI capabilities, please configure the OPENAI_API_KEY in your environment. "
            "For now, I can help with basic analysis - try asking me to 'analyze' the data!",
            None,
        )

    return (
        f"I received your message: \"{message}\". "
        "I don't see any spreadsheet data in the current context. "
        "Please make sure you have data in your spreadsheet, and I'll be able to help you analyze it. "
        "To enable full AI capabilities, configure the OPENAI_API_KEY environment variable.",
        None,
    )


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: CurrentUser,
) -> ChatResponse:
    """
    Send a chat message with optional spreadsheet context.

    The AI assistant will respond based on the message and any provided
    spreadsheet context, potentially suggesting actions to perform on the data.
    """
    response_text, actions = await get_ai_response(
        message=request.message,
        context=request.context,
        history=request.history,
    )

    return ChatResponse(response=response_text, actions=actions)

# Gemini API

The Gemini API is the fastest path from prompt to production with Gemini, Veo,
Nano Banana, and more. It lets you integrate these generative models into your
applications to generate text and images, analyze multimodal inputs, and build
conversational agents.

{% tabs %}
  {% tab filename="main.py" label="Python" %}
  ```python
  from google import genai
  
  client = genai.Client()
  
  interaction = client.interactions.create(
      model="gemini-3.7-flash",
      input="Explain how AI works in a few words"
  )
  
  print(interaction.output_text)
  ```

  {% /tab %}

  {% tab filename="index.js" label="JavaScript" %}
  ```javascript
  import { GoogleGenAI } from "@google/genai";
  
  const ai = new GoogleGenAI({});
  
  const interaction = await ai.interactions.create({
    model: "gemini-3.7-flash",
    input: "Explain how AI works in a few words",
  });
  
  console.log(interaction.output_text);
  ```

  {% /tab %}

  {% tab label="REST" %}
  ```bash
  curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
      "model": "gemini-3.7-flash",
      "input": "Explain how AI works in a few words"
    }'
  ```

  {% /tab %}

{% /tabs %}

Follow our [Quickstart](/docs/get-started) guide to get an API key and make your
first API call in minutes.

{% button href="/docs/get-started" variant="primary" %}
  Start building

{% /button %}

## Meet the models  {% class="hide-from-toc" id="meet-the-models" %}

[View all](/docs/models)

{% card-grid %}
  {% card badge="New" description="Our most intelligent model, the best in the world for\nmultimodal understanding, all built on state-of-the-art reasoning." href="/docs/models/gemini-3.1-pro-preview" icon="auto_awesome" title="Gemini\n3.1 Pro" /%}

  {% card badge="New" description="Our latest and most capable Flash model, built for complex coding, agentic workflows, and reliable multi-step execution." href="/docs/models/gemini-3.7-flash" icon="spark" title="Gemini 3.7 Flash" /%}

  {% card badge="New" description="Our previous-generation Flash model, balancing speed and multimodal capabilities across general agentic and everyday tasks." href="/docs/models/gemini-3.6-flash" icon="spark" title="Gemini 3.6 Flash" /%}

  {% card description="Our legacy Flash model, providing baseline speed and foundational performance for routine, high-throughput workloads." href="/docs/models/gemini-3.5-flash" icon="spark" title="Gemini 3.5 Flash" /%}

  {% card badge="New" description="High-volume, cost-sensitive model optimized for low-latency high throughput subagent tasks." href="/docs/models/gemini-3.5-flash-lite" icon="spark" title="Gemini 3.5 Flash-Lite" /%}

  {% card description="High-volume, cost-sensitive model with the performance and quality\nof the Gemini 3 series." href="/docs/models/gemini-3.1-flash-lite" icon="spark" title="Gemini 3.1 Flash-Lite" /%}

  {% card description="Frontier-class performance rivaling larger models at a fraction of\nthe cost." href="/docs/models/gemini-3-flash-preview" icon="spark" title="Gemini 3 Flash" /%}

  {% card description="State-of-the-art image generation and editing models." href="/docs/image-generation" title="🍌 Nano Banana 2 and Nano Banana\nPro" /%}

  {% card description="Our state-of-the-art\nvideo generation model, with native audio." href="/docs/video" icon="video_library" title="Veo 3.1" /%}

  {% card description=A
vision-language model (VLM) that brings Gemini's agentic capabilities to
robotics and enables advanced reasoning in the physical world. href="/docs/robotics-overview" icon="spark" title="Gemini Robotics" /%}

  

{% /card-grid %}

## Explore Capabilities  {% class="hide-from-toc" id="explore-capabilities" %}

{% card-grid %}
  {% card description="Generate and edit highly contextual\nimages natively with Gemini 2.5 Flash Image." href="/docs/image-generation" icon="imagesmode" title=Native Image
Generation (Nano Banana) /%}

  {% card description="Input\nmillions of tokens to Gemini models and derive understanding from unstructured\nimages, videos, and documents." href="/docs/long-context" icon="article" title="Long Context" /%}

  {% card description="Constrain Gemini to respond with JSON, a structured data format\nsuitable for automated processing." href="/docs/structured-output" icon="code" title="Structured Outputs" /%}

  {% card description="Build agentic workflows by connecting Gemini to external APIs and\ntools." href="/docs/function-calling" icon="functions" title="Function Calling" /%}

  {% card description="Create high-quality video content from text or image prompts with\nour state-of-the-art model." href="/docs/video" icon="videocam" title="Video Generation with Veo 3.1" /%}

  {% card description="Build real-time voice applications and agents with the Live API." href="/docs/live-api" icon="android_recorder" title="Voice Agents with Live API" /%}

  {% card description="Connect Gemini to the\nworld through built-in tools like Google Search, URL Context, Google Maps, Code\nExecution and Computer Use." href="/docs/tools" icon="build" title="Tools" /%}

  {% card description="Process up to 1000 pages of PDF files with full multimodal\nunderstanding or other text-based file types." href="/docs/document-processing" icon="stacks" title="Document Understanding" /%}

  {% card description="Explore how thinking\ncapabilities improve reasoning for complex tasks and agents." href="/docs/thinking" icon="cognition_2" title="Thinking" /%}

  

{% /card-grid %}

## Interactions API  {% class="hide-from-toc" id="interactions-api" %}

The **Interactions API** has become our default interface as of June 2026 and is
the best way to build with Gemini models and agents going forward. If you're
starting a new project, you should use the Interactions API. While it remains
supported, the `generateContent` API is now considered legacy.

{% card-grid %}
  {% card description="Learn how the Interactions API manages conversation state, messages, and output formats." href="/docs/interactions-overview" icon="hub" title="Interactions Overview" /%}

  {% card description="Step-by-step guide to transition your code from generateContent to the Interactions API." href="/docs/migrate-to-interactions" icon="swap_horiz" title="Migration Guide" /%}

  {% card description="Stream real-time tokens, incremental thoughts, and tool call events." href="/docs/streaming" icon="stream" title="Streaming" /%}

{% /card-grid %}

# Set up your coding assistant with Gemini MCP and Skills

AI coding assistants are powerful but have limitations—training data cuts off
at a specific date, missing new API features and changes. Without access to
Gemini-specific documentation, agents may suggest generic patterns instead of
optimized approaches.

To keep your coding assistant current with the evolving Gemini API and its
recommended usage, we recommend setting up the **Gemini Docs MCP** and enhancing
your environment with **Gemini API Skills**. While these tools are usable
independently, they are designed to work together to provide complete coverage.

## Connect the Gemini Docs MCP  {% id="mcp-setup" %}

Gemini hosts a public Model Context Protocol (MCP) server at
`https://gemini-api-docs-mcp.dev`. Connecting your coding agent to this server
ensures that all queries have access to the latest APIs, code updates, and
optimal configuration examples.

Run the following command in your agent's terminal or project root to install
the server:

```bash
npx add-mcp "https://gemini-api-docs-mcp.dev"
```

This server adds a `search_documentation` function that your agent can use to
retrieve real-time API definitions and integration patterns from the official
Gemini documentation files.

## Add API Development Skills  {% id="available-skills" %}

The skills provide **baked-in rules and best practices** (such as enforcing the
correct SDK and current model versions) directly in your assistant's context.
The skill works together with the Gemini Docs MCP service: If you have both
installed, the skill uses the MCP service for documentation, but even without
the MCP installed, it will fetch `llms.txt` from `ai.google.dev` as a fallback.

To install these skills, you can use one of the following supported tools.
Installation instructions for both are provided below each skill module:

- **[skills.sh](https://skills.sh)**: Recommended. The open standard for portable agent behaviors.
- **[Context7](https://context7.com)**: Supported for users already utilizing the Context7 ecosystem.

### gemini-api-dev  {% id="gemini-api-dev" %}

The foundational skill for general-purpose Gemini development. This skill
provides documentation and best practices for:

- Prompt routing to current models (e.g., Gemini 3.1 Pro/Flash) and avoiding deprecated models
- Multimodal prompting, function calling, structured outputs, and common integration patterns

#### Install with skills.sh  {% id="api-dev-npx" %}

```bash
npx skills add google-gemini/gemini-skills --skill gemini-api-dev --global
```

#### Install with Context7  {% id="api-dev-ctx7" %}

```bash
npx ctx7 skills install /google-gemini/gemini-skills gemini-api-dev
```

### gemini-live-api-dev  {% id="gemini-live-api-dev" %}

Skill for building real-time conversational AI applications with Gemini Live
API. This skill provides documentation and best practices for:

- WebSocket connections for low-latency streaming
- Streaming audio, video, and text
- Voice activity detection and barge-in support

#### Install with skills.sh  {% id="live-api-dev-npx" %}

```bash
npx skills add google-gemini/gemini-skills --skill gemini-live-api-dev --global
```

#### Install with Context7  {% id="live-api-dev-ctx7" %}

```bash
npx ctx7 skills install /google-gemini/gemini-skills gemini-live-api-dev
```

### gemini-interactions-api  {% id="gemini-interactions-api" %}

Skill for building apps with the
[Interactions API](/docs/interactions-overview). The Interactions API is a
unified interface for interacting with Gemini models and agents, designed for
agentic applications. This skill covers:

- Text generation, multi-turn chat, and streaming
- Function calling, structured output, and image generation
- Background execution and Deep Research agents
- Server-side conversation state management
- Python and TypeScript SDK patterns

#### Install with skills.sh  {% id="interactions-npx" %}

```bash
npx skills add google-gemini/gemini-skills --skill gemini-interactions-api --global
```

#### Install with Context7  {% id="interactions-ctx7" %}

```bash
npx ctx7 skills install /google-gemini/gemini-skills gemini-interactions-api
```

## Verify installation  {% id="verify-installation" %}

After installing, confirm that your coding assistant can connect to the Gemini
Docs MCP server and use your installed skills.

### 1. Verify agent behavior  {% id="gemini-test" %}

The most reliable way to verify is to ask your agent a technical question about
Gemini API.

**Prompt:** "How do I use context caching with the Gemini API?"

A successful setup will:

- **Provide accurate code**: Reference specific Gemini methods like `cacheContent` or `cachedContents.create` from the latest endpoints.
- **Use the MCP Tool**: Show that it is connected to the **Gemini Docs MCP Server** or utilizing the `search_documentation` tool to fetch data.
- **Invoke loaded skills**: Show an indicator that it is "Using skill: gemini-api-dev" (if relying on a secondary wrapper).

### 2. Verify manifestations & tools  {% id="manifest-check" %}

If the agent gives a general or generic answer, use the specific Discovery or
Status commands for your environment to verify that the Docs MCP or skill is
loaded into memory.

| Environment | MCP Verification | Skills Verification |
| :--- | :--- | :--- |
| **Claude Code** | Type `/mcp` in the terminal to view active servers and `search_documentation` tools. | Type `/skills` in the terminal to list all active manifests. |
| **Cursor** | Navigate to **Settings > Features > MCP**. Ensure server is "Connected". | Open **Settings > Rules**. Verify the skill appears under "Agent Decides." |
| **Antigravity** | Check the **Customizations > Connections** sidebar for MCP status. | Type `/skills list` or check the **Customizations > Rules** sidebar. |
| **Gemini CLI** | Run `gemini mcp list` or use `/mcp list`. | Run `gemini skills list` or use the `/skills` slash command in-session. |
| **Copilot** | Type `@gemini /mcp` to list active data connectors. | Type `@gemini /skills` (or `/skills`) to view active extensions. |

## Troubleshooting  {% id="troubleshooting" %}

If your agent provides only general information or fails to recognize
Gemini-specific methods, check the following:

### Agent didn't discover the skill  {% id="agent-discovery" %}

Most agents index skills only on startup.

**Fix:** Completely restart your IDE (Cursor/VS Code) or exit and re-open your
terminal-based agent (Claude Code).

### Global vs. local conflict  {% id="global-local-conflict" %}

If you installed with the `--global` flag, your agent might be ignoring it in
favor of project-specific rules.

**Fix:** Try installing the skill directly into your project root without the
global flag:

```bash
npx skills add google-gemini/gemini-skills --skill gemini-api-dev
```

## Resources  {% id="resources" %}

- [Gemini API skills on GitHub](https://github.com/google-gemini/gemini-skills)
- [Interactions API](/docs/interactions-overview)
- [Get started](/docs/get-started)
- [Libraries](/docs/libraries)

Gemini models can process documents in PDF format, using native
vision to understand entire document contexts. This goes beyond
just text extraction, allowing Gemini to:

- Analyze and interpret content, including text, images, diagrams, charts, and tables, even in long documents up to 1000 pages.
- Extract information into [structured output](https://ai.google.dev/gemini-api/docs/structured-output) formats.
- Summarize and answer questions based on both the visual and textual elements in a document.
- Transcribe document content (e.g. to HTML), preserving layouts and formatting, for use in downstream applications.

You can also pass non-PDF documents in the same way but Gemini will see them
as normal text which will eliminate context like charts or formatting.

## Passing PDF data inline

You can pass PDF data inline in the request. This is best
suited for smaller documents or temporary processing where you don't need to
reference the file in subsequent requests. We recommend using the
[Files API](https://ai.google.dev/gemini-api/docs/document-processing#large-pdfs)
for larger documents that you need to refer to in multi-turn interactions to
improve request latency and reduce bandwidth usage.

The following example shows you how to pass PDF data inline:

### Python

    from google import genai
    import base64

    client = genai.Client()

    with open('path/to/document.pdf', 'rb') as f:
        pdf_bytes = f.read()

    interaction = client.interactions.create(
        model="gemini-3.7-flash",
        input=[
            {
                "type": "document",
                "data": base64.b64encode(pdf_bytes).decode('utf-8'),
                "mime_type": "application/pdf"
            },
            {"type": "text", "text": "Summarize this document"}
        ]
    )

    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    const ai = new GoogleGenAI({});

    async function main() {
        const pdfData = fs.readFileSync("path/to/document.pdf", {
            encoding: "base64"
        });

        const interaction = await ai.interactions.create({
            model: "gemini-3.7-flash",
            input: [
                { type: "text", text: "Summarize this document" },
                {
                    type: "document",
                    data: pdfData,
                    mime_type: "application/pdf"
                }
            ]
        });
        console.log(interaction.output_text);
    }

    main();

### REST

    PDF_PATH="path/to/document.pdf"

    if [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      B64FLAGS="--input"
    else
      B64FLAGS="-w0"
    fi

    curl -X POST "https://generativelanguage.googleapis.com/v1beta/interactions" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "model": "gemini-3.7-flash",
        "input": [
          {
            "type": "document",
            "data": "'$(base64 $B64FLAGS $PDF_PATH)'",
            "mime_type": "application/pdf"
          },
          {"type": "text", "text": "Summarize this document"}
        ]
      }'

You can also upload a local PDF file for processing:

### Python

    from google import genai

    client = genai.Client()

    uploaded_file = client.files.upload(file="file.pdf")

    interaction = client.interactions.create(
        model="gemini-3.7-flash",
        input=[
            {"type": "document", "uri": uploaded_file.uri, "mime_type": uploaded_file.mime_type},
            {"type": "text", "text": "Summarize this document"}
        ]
    )
    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
        const uploadedFile = await ai.files.upload({
            file: "file.pdf",
            config: { mime_type: "application/pdf" }
        });

        const interaction = await ai.interactions.create({
            model: "gemini-3.7-flash",
            input: [
                { type: "text", text: "Summarize this document" },
                {
                    type: "document",
                    uri: uploadedFile.uri,
                    mime_type: uploadedFile.mime_type
                }
            ]
        });
        console.log(interaction.output_text);
    }

    main();

### REST

    PDF_PATH="file.pdf"
    NUM_BYTES=$(wc -c < "${PDF_PATH}")
    DISPLAY_NAME="file.pdf"
    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: application/pdf" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${PDF_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq -r ".file.uri" file_info.json)
    echo file_uri=$file_uri

    # Now create an interaction using that file
    curl "https://generativelanguage.googleapis.com/v1beta/interactions" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "model": "gemini-3.7-flash",
          "input": [
            {"type": "document", "uri": "'$file_uri'", "mime_type": "application/pdf"},
            {"type": "text", "text": "Summarize this document"}
          ]
        }' 2> /dev/null > response.json

    cat response.json
    echo

    jq -r ".steps[-1].content[0].text" response.json

## Uploading PDFs using the Files API

We recommend you use Files API for larger files or when you intend to reuse a
document across multiple requests. This improves request latency and reduces
bandwidth usage by decoupling the file upload from the model requests.

> [!NOTE]
> **Note:** The Files API is available at no cost in all regions where the Gemini API is available. Uploaded files are stored for 48 hours.

### Large PDFs from URLs

Use the File API to simplify uploading and processing large PDF files from URLs:

### Python

    from google import genai
    import io
    import httpx

    client = genai.Client()

    long_context_pdf_path = "https://arxiv.org/pdf/2312.11805"

    doc_io = io.BytesIO(httpx.get(long_context_pdf_path).content)

    sample_doc = client.files.upload(
      file=doc_io,
      config=dict(
        mime_type='application/pdf')
    )

    prompt = "Summarize this document"

    interaction = client.interactions.create(
        model="gemini-3.7-flash",
        input=[
            {"type": "document", "uri": sample_doc.uri, "mime_type": sample_doc.mime_type},
            {"type": "text", "text": prompt}
        ]
    )
    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {

        const pdfBuffer = await fetch("https://arxiv.org/pdf/2312.11805")
            .then((response) => response.arrayBuffer());

        const fileBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

        const file = await ai.files.upload({
            file: fileBlob,
            config: {
                displayName: 'A17_FlightPlan.pdf',
            },
        });

        let getFile = await ai.files.get({ name: file.name });
        while (getFile.state === 'PROCESSING') {
            getFile = await ai.files.get({ name: file.name });
            console.log(`current file status: ${getFile.state}`);
            console.log('File is still processing, retrying in 5 seconds');

            await new Promise((resolve) => {
                setTimeout(resolve, 5000);
            });
        }
        if (file.state === 'FAILED') {
            throw new Error('File processing failed.');
        }

        const interaction = await ai.interactions.create({
            model: 'gemini-3.7-flash',
            input: [
                { type: "document", uri: file.uri, mime_type: file.mime_type },
                { type: "text", text: "Summarize this document" }
            ],
        });

        console.log(interaction.output_text);

    }

    main();

### REST

    PDF_PATH="https://arxiv.org/pdf/2312.11805"
    DISPLAY_NAME="Gemini_paper"
    PROMPT="Summarize this document"

    # Download the PDF from the provided URL
    wget -O "${DISPLAY_NAME}.pdf" "${PDF_PATH}"

    MIME_TYPE=$(file -b --mime-type "${DISPLAY_NAME}.pdf")
    NUM_BYTES=$(wc -c < "${DISPLAY_NAME}.pdf")

    echo "MIME_TYPE: ${MIME_TYPE}"
    echo "NUM_BYTES: ${NUM_BYTES}"

    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${DISPLAY_NAME}.pdf" 2> /dev/null > file_info.json

    file_uri=$(jq -r ".file.uri" file_info.json)
    echo "file_uri: ${file_uri}"

    # Create payload JSON file for safety
    cat << EOF > payload.json
    {
      "model": "gemini-3.7-flash",
      "input": [
        {"type": "text", "text": "${PROMPT}"},
        {"type": "document", "uri": "${file_uri}", "mime_type": "application/pdf"}
      ]
    }
    EOF

    # Now create an interaction using that file
    curl "https://generativelanguage.googleapis.com/v1beta/interactions" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d @payload.json 2> /dev/null > response.json

    cat response.json
    echo

    jq ".steps[-1].content[0].text" response.json

    # Clean up
    rm "${DISPLAY_NAME}.pdf"
    rm payload.json

### Large PDFs stored locally

### Python

    from google import genai
    import pathlib

    client = genai.Client()

    file_path = pathlib.Path('large_file.pdf')
    sample_file = client.files.upload(
        file=file_path,
    )

    interaction = client.interactions.create(
        model="gemini-3.7-flash",
        input=[
            {"type": "document", "uri": sample_file.uri, "mime_type": sample_file.mime_type},
            {"type": "text", "text": "Summarize this document"}
        ]
    )
    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
        const file = await ai.files.upload({
            file: 'large_file.pdf',
            config: {
                displayName: 'A17_FlightPlan.pdf',
            },
        });

        let getFile = await ai.files.get({ name: file.name });
        while (getFile.state === 'PROCESSING') {
            getFile = await ai.files.get({ name: file.name });
            console.log(`current file status: ${getFile.state}`);
            console.log('File is still processing, retrying in 5 seconds');

            await new Promise((resolve) => {
                setTimeout(resolve, 5000);
            });
        }
        if (file.state === 'FAILED') {
            throw new Error('File processing failed.');
        }

        const interaction = await ai.interactions.create({
            model: 'gemini-3.7-flash',
            input: [
                { type: "document", uri: file.uri, mime_type: file.mime_type },
                { type: "text", text: "Summarize this document" }
            ],
        });

        console.log(interaction.output_text);

    }

    main();

### REST

    PDF_PATH="large_file.pdf"
    NUM_BYTES=$(wc -c < "${PDF_PATH}")
    DISPLAY_NAME=TEXT
    tmp_header_file=upload-header.tmp

    # Initial resumable request defining metadata.
    # The upload url is in the response headers dump them to a file.
    curl "https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}" \
      -D upload-header.tmp \
      -H "X-Goog-Upload-Protocol: resumable" \
      -H "X-Goog-Upload-Command: start" \
      -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Header-Content-Type: application/pdf" \
      -H "Content-Type: application/json" \
      -d "{'file': {'display_name': '${DISPLAY_NAME}'}}" 2> /dev/null

    upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
    rm "${tmp_header_file}"

    # Upload the actual bytes.
    curl "${upload_url}" \
      -H "Content-Length: ${NUM_BYTES}" \
      -H "X-Goog-Upload-Offset: 0" \
      -H "X-Goog-Upload-Command: upload, finalize" \
      --data-binary "@${PDF_PATH}" 2> /dev/null > file_info.json

    file_uri=$(jq -r ".file.uri" file_info.json)
    echo file_uri=$file_uri

    # Now create an interaction using that file
    curl "https://generativelanguage.googleapis.com/v1beta/interactions" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d '{
          "model": "gemini-3.7-flash",
          "input": [
            {"type": "document", "uri": "'$file_uri'", "mime_type": "application/pdf"},
            {"type": "text", "text": "Can you add a few more lines to this poem?"}
          ]
        }' 2> /dev/null > response.json

    cat response.json
    echo

    jq -r ".steps[-1].content[0].text" response.json

You can verify the API successfully stored the uploaded file and get its
metadata by calling [`files.get`](https://ai.google.dev/api/rest/v1beta/files/get). Only the `name`
(and by extension, the `uri`) are unique.

### Python

    from google import genai
    import pathlib

    client = genai.Client()

    fpath = pathlib.Path('example.pdf')
    fpath.write_text('hello')

    file = client.files.upload(file='example.pdf')

    file_info = client.files.get(name=file.name)
    print(file_info.model_dump_json(indent=4))

### JavaScript

    import { GoogleGenAI } from "@google/genai";
    import * as fs from "node:fs";

    const ai = new GoogleGenAI({});

    async function main() {
        fs.writeFileSync("example.pdf", "hello");

        const file = await ai.files.upload({
            file: "example.pdf",
            config: { mime_type: "application/pdf" }
        });

        const fileInfo = await ai.files.get({ name: file.name });
        console.log(fileInfo);
    }

    main();

### REST

    name=$(jq -r ".file.name" file_info.json)
    # Get the file of interest to check state
    curl "https://generativelanguage.googleapis.com/v1beta/$name?key=$GEMINI_API_KEY" > file_info.json
    # Print some information about the file you got
    name=$(jq -r ".name" file_info.json)
    echo name=$name
    file_uri=$(jq -r ".uri" file_info.json)
    echo file_uri=$file_uri

## Passing multiple PDFs

The Gemini API is capable of processing multiple PDF documents (up to 1000 pages)
in a single request, as long as the combined size of the documents and the text
prompt stays within the model's context window.

### Python

    from google import genai
    import io
    import httpx

    client = genai.Client()

    doc_url_1 = "https://arxiv.org/pdf/2312.11805"
    doc_url_2 = "https://arxiv.org/pdf/2403.05530"

    doc_data_1 = io.BytesIO(httpx.get(doc_url_1).content)
    doc_data_2 = io.BytesIO(httpx.get(doc_url_2).content)

    sample_pdf_1 = client.files.upload(
      file=doc_data_1,
      config=dict(mime_type='application/pdf')
    )
    sample_pdf_2 = client.files.upload(
      file=doc_data_2,
      config=dict(mime_type='application/pdf')
    )

    prompt = "What is the difference between each of the main benchmarks between these two papers? Output these in a table."

    interaction = client.interactions.create(
        model="gemini-3.7-flash",
        input=[
            {"type": "document", "uri": sample_pdf_1.uri, "mime_type": sample_pdf_1.mime_type},
            {"type": "document", "uri": sample_pdf_2.uri, "mime_type": sample_pdf_2.mime_type},
            {"type": "text", "text": prompt}
        ]
    )

    print(interaction.output_text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function uploadRemotePDF(url, displayName) {
        const pdfBuffer = await fetch(url)
            .then((response) => response.arrayBuffer());

        const fileBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

        const file = await ai.files.upload({
            file: fileBlob,
            config: {
                displayName: displayName,
            },
        });

        let getFile = await ai.files.get({ name: file.name });
        while (getFile.state === 'PROCESSING') {
            getFile = await ai.files.get({ name: file.name });
            console.log(`current file status: ${getFile.state}`);
            console.log('File is still processing, retrying in 5 seconds');

            await new Promise((resolve) => {
                setTimeout(resolve, 5000);
            });
        }
        if (file.state === 'FAILED') {
            throw new Error('File processing failed.');
        }

        return file;
    }

    async function main() {
        const file1 = await uploadRemotePDF("https://arxiv.org/pdf/2312.11805", "PDF 1");
        const file2 = await uploadRemotePDF("https://arxiv.org/pdf/2403.05530", "PDF 2");

        const interaction = await ai.interactions.create({
            model: 'gemini-3.7-flash',
            input: [
                { type: "document", uri: file1.uri, mime_type: file1.mime_type },
                { type: "document", uri: file2.uri, mime_type: file2.mime_type },
                { type: "text", text: "What is the difference between each of the main benchmarks between these two papers? Output these in a table." }
            ],
        });

        console.log(interaction.output_text);
    }

    main();

### REST

    DOC_URL_1="https://arxiv.org/pdf/2312.11805"
    DOC_URL_2="https://arxiv.org/pdf/2403.05530"
    DISPLAY_NAME_1="Gemini_paper"
    DISPLAY_NAME_2="Gemini_1.5_paper"
    PROMPT="What is the difference between each of the main benchmarks between these two papers? Output these in a table."

    # Function to download and upload a PDF
    upload_pdf() {
      local doc_url="$1"
      local display_name="$2"

      echo "Downloading ${display_name} from ${doc_url}..." >&2
      # Download the PDF
      wget -O "${display_name}.pdf" "${doc_url}" 2> /dev/null

      local MIME_TYPE=$(file -b --mime-type "${display_name}.pdf")
      local NUM_BYTES=$(wc -c < "${display_name}.pdf")

      echo "MIME_TYPE: ${MIME_TYPE}" >&2
      echo "NUM_BYTES: ${NUM_BYTES}" >&2

      local tmp_header_file="upload-header-${display_name}.tmp"

      # Initial resumable request
      # Using GEMINI_API_KEY instead of GOOGLE_API_KEY
      curl "https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}" \
        -D "${tmp_header_file}" \
        -H "X-Goog-Upload-Protocol: resumable" \
        -H "X-Goog-Upload-Command: start" \
        -H "X-Goog-Upload-Header-Content-Length: ${NUM_BYTES}" \
        -H "X-Goog-Upload-Header-Content-Type: ${MIME_TYPE}" \
        -H "Content-Type: application/json" \
        -d "{'file': {'display_name': '${display_name}'}}" 2> /dev/null

      local upload_url=$(grep -i "x-goog-upload-url: " "${tmp_header_file}" | cut -d" " -f2 | tr -d "\r")
      rm "${tmp_header_file}"

      echo "Upload URL for ${display_name}: ${upload_url}" >&2

      # Upload the PDF
      curl "${upload_url}" \
        -H "Content-Length: ${NUM_BYTES}" \
        -H "X-Goog-Upload-Offset: 0" \
        -H "X-Goog-Upload-Command: upload, finalize" \
        --data-binary "@${display_name}.pdf" 2> /dev/null > "file_info_${display_name}.json"

      local file_uri=$(jq -r ".file.uri" "file_info_${display_name}.json")
      echo "file_uri for ${display_name}: ${file_uri}" >&2

      # Clean up the downloaded PDF
      rm "${display_name}.pdf"

      echo "${file_uri}"
    }

    # Upload the first PDF
    file_uri_1=$(upload_pdf "${DOC_URL_1}" "${DISPLAY_NAME_1}")

    # Upload the second PDF
    file_uri_2=$(upload_pdf "${DOC_URL_2}" "${DISPLAY_NAME_2}")

    # Create payload JSON file for safety
    cat << EOF > payload_multi.json
    {
      "model": "gemini-3.7-flash",
      "input": [
        {"type": "document", "uri": "${file_uri_1}", "mime_type": "application/pdf"},
        {"type": "document", "uri": "${file_uri_2}", "mime_type": "application/pdf"},
        {"type": "text", "text": "${PROMPT}"}
      ]
    }
    EOF

    # Now create an interaction using both files
    # Using GEMINI_API_KEY instead of GOOGLE_API_KEY
    curl "https://generativelanguage.googleapis.com/v1beta/interactions" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H 'Content-Type: application/json' \
        -X POST \
        -d @payload_multi.json 2> /dev/null > response.json

    cat response.json
    echo

    jq ".steps[-1].content[0].text" response.json

    # Clean up
    rm payload_multi.json
    rm "file_info_${DISPLAY_NAME_1}.json"
    rm "file_info_${DISPLAY_NAME_2}.json"

## Technical details

Gemini supports PDF files up to 50MB or 1000 pages. This limit applies
to both inline data and Files API uploads. Each document page is equivalent to 258
tokens.

While there are no specific limits to the number of pixels in a document besides
the model's [context window](https://ai.google.dev/gemini-api/docs/long-context), larger pages are
scaled down to a maximum resolution of 3072 x 3072 while preserving their original
aspect ratio, while smaller pages are scaled up to 768 x 768 pixels. There is no
cost reduction for pages at lower sizes, other than bandwidth, or performance
improvement for pages at higher resolution.

### Gemini 3 models

Gemini 3 introduces granular control over multimodal vision processing with the
`media_resolution` parameter. You can now set the resolution to low, medium, or
high per individual media part. With this addition, the processing of PDF
documents has been updated:

1. **Native text inclusion:** Text natively embedded in the PDF is extracted and provided to the model.
2. **Billing \& token reporting:**
   - You are **not charged** for tokens originating from the extracted **native text** in PDFs.
   - In the `usage_metadata` section of the API response, tokens generated from processing PDF pages (as images) are now counted under the `IMAGE` modality, not a separate `DOCUMENT` modality as in some earlier versions.

For more details about the media resolution parameter, see the
[Media resolution](https://ai.google.dev/gemini-api/docs/interactions/media-resolution) guide.

### Document types

Technically, you can pass other MIME types for document understanding, like
TXT, Markdown, HTML, XML, etc. However, document vision ***only meaningfully
understands PDFs***. Other types will be extracted as pure text, and the model
won't be able to interpret what we see in the rendering of those files. Any
file-type specifics like charts, diagrams, HTML tags, Markdown formatting, etc.,
will be lost.

To learn about other file input methods, see the
[File input methods](https://ai.google.dev/gemini-api/docs/file-input-methods) guide.

### Best practices

For best results:

- Rotate pages to the correct orientation before uploading.
- Avoid blurry pages.
- If using a single page, place the text prompt after the page.

## What's next

To learn more, see the following resources:

- [File prompting strategies](https://ai.google.dev/gemini-api/docs/files#prompt-guide): The Gemini API supports prompting with text, image, audio, and video data, also known as multimodal prompting.
- [System instructions](https://ai.google.dev/gemini-api/docs/text-generation#system-instructions): System instructions let you steer the behavior of the model based on your specific needs and use cases.
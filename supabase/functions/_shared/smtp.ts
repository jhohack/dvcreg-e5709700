import { envValue, intEnv, requireEnv } from "./env.ts"

type SmtpSecurityMode = "none" | "ssl" | "tls"
type SmtpConn = Deno.Conn | Deno.TlsConn

class SmtpClient {
  private conn: SmtpConn
  private decoder = new TextDecoder()
  private encoder = new TextEncoder()
  private buffer = ""

  constructor(conn: SmtpConn, private readonly hostname: string) {
    this.conn = conn
  }

  async assertResponse(expectedCodes: number[], context: string, sensitive = false): Promise<string> {
    const response = await this.readResponse()
    if (!expectedCodes.includes(response.code)) {
      const label = sensitive ? "[redacted]" : context
      throw new Error(`SMTP command failed (${label}): ${response.message}`)
    }

    return response.message
  }

  async command(command: string, expectedCodes: number[], sensitive = false): Promise<string> {
    await this.writeLine(command)
    return await this.assertResponse(expectedCodes, command, sensitive)
  }

  async startTls(): Promise<void> {
    this.conn = await Deno.startTls(this.conn as Deno.Conn, {
      hostname: this.hostname,
    })
    this.buffer = ""
  }

  async writeRaw(data: Uint8Array): Promise<void> {
    let offset = 0
    while (offset < data.length) {
      offset += await this.conn.write(data.subarray(offset))
    }
  }

  close(): void {
    try {
      this.conn.close()
    } catch {
      // Ignore close errors during teardown.
    }
  }

  private async writeLine(line: string): Promise<void> {
    await this.writeRaw(this.encoder.encode(`${line}\r\n`))
  }

  private async readResponse(): Promise<{ code: number; message: string }> {
    const lines: string[] = []

    while (true) {
      const line = await this.readLine()
      lines.push(line)
      if (line.length < 4 || line[3] !== "-") {
        break
      }
    }

    return {
      code: Number.parseInt(lines[0]?.slice(0, 3) ?? "0", 10),
      message: lines.join(" "),
    }
  }

  private async readLine(): Promise<string> {
    while (true) {
      const newlineIndex = this.buffer.indexOf("\n")
      if (newlineIndex !== -1) {
        const line = this.buffer.slice(0, newlineIndex + 1)
        this.buffer = this.buffer.slice(newlineIndex + 1)
        return line.replace(/\r?\n$/, "")
      }

      const chunk = new Uint8Array(1024)
      const bytesRead = await this.conn.read(chunk)
      if (bytesRead === null) {
        throw new Error("The SMTP server closed the connection unexpectedly.")
      }

      this.buffer += this.decoder.decode(chunk.subarray(0, bytesRead), { stream: true })
    }
  }
}

function smtpSecurityMode(): SmtpSecurityMode {
  const mode = (envValue("SMTP_SECURE", "tls") ?? "tls").toLowerCase()

  switch (mode) {
    case "":
    case "none":
    case "off":
      return "none"
    case "ssl":
    case "smtps":
      return "ssl"
    default:
      return "tls"
  }
}

function smtpClientHostname(): string {
  const configuredHost = envValue("SMTP_CLIENT_HOSTNAME")
  if (configuredHost) {
    return configuredHost.replace(/[^A-Za-z0-9.-]/g, "-")
  }

  const supabaseUrl = envValue("SUPABASE_URL")
  if (!supabaseUrl) {
    return "localhost"
  }

  try {
    return new URL(supabaseUrl).hostname.replace(/[^A-Za-z0-9.-]/g, "-")
  } catch {
    return "localhost"
  }
}

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function encodeMailHeader(value: string): string {
  return /^[\x20-\x7E]+$/.test(value) ? value : `=?UTF-8?B?${base64Encode(value)}?=`
}

function formatEmailAddress(email: string, name?: string): string {
  const address = email.trim()
  if (!name || name.trim() === "") {
    return `<${address}>`
  }

  return `${encodeMailHeader(name.trim())} <${address}>`
}

function normalizeMailBody(body: string): string {
  return body.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

function encodeMailBody(body: string): string {
  const encoded = base64Encode(normalizeMailBody(body))
  const parts = encoded.match(/.{1,76}/g) ?? [encoded]
  return parts.join("\r\n")
}

function buildBoundary(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `b${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`
}

function buildMessage(
  fromAddress: string,
  fromName: string,
  recipientEmail: string,
  subject: string,
  htmlBody: string,
  textBody: string,
): string {
  const boundary = buildBoundary()

  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `From: ${formatEmailAddress(fromAddress, fromName)}`,
    `To: ${formatEmailAddress(recipientEmail)}`,
    `Subject: ${encodeMailHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodeMailBody(textBody),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodeMailBody(htmlBody),
    "",
    `--${boundary}--`,
  ]

  return [...headers, "", ...body].join("\r\n")
}

function escapeData(message: string): string {
  const normalized = message.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  return normalized.replace(/^\./gm, "..").replace(/\n/g, "\r\n") + "\r\n.\r\n"
}

async function openConnection(hostname: string, port: number, security: SmtpSecurityMode): Promise<SmtpClient> {
  const conn = security === "ssl"
    ? await Deno.connectTls({ hostname, port })
    : await Deno.connect({ hostname, port })

  return new SmtpClient(conn, hostname)
}

export async function sendEmail(options: {
  recipientEmail: string
  subject: string
  htmlBody: string
  textBody: string
}): Promise<void> {
  const host = requireEnv("SMTP_HOST")
  const port = intEnv("SMTP_PORT", 465)
  const username = requireEnv("SMTP_USERNAME")
  const password = requireEnv("SMTP_PASSWORD")
  const fromAddress = envValue("MAIL_FROM_ADDRESS", username) ?? username
  const fromName = envValue("MAIL_FROM_NAME", "DVC Registration") ?? "DVC Registration"
  const security = smtpSecurityMode()
  const client = await openConnection(host, port, security)

  try {
    await client.assertResponse([220], "connect")
    await client.command(`EHLO ${smtpClientHostname()}`, [250])

    if (security === "tls") {
      await client.command("STARTTLS", [220])
      await client.startTls()
      await client.command(`EHLO ${smtpClientHostname()}`, [250])
    }

    await client.command("AUTH LOGIN", [334])
    await client.command(base64Encode(username), [334], true)
    await client.command(base64Encode(password), [235], true)
    await client.command(`MAIL FROM:<${fromAddress}>`, [250])
    await client.command(`RCPT TO:<${options.recipientEmail}>`, [250, 251])
    await client.command("DATA", [354])

    const message = buildMessage(
      fromAddress,
      fromName,
      options.recipientEmail,
      options.subject,
      options.htmlBody,
      options.textBody,
    )

    await client.writeRaw(new TextEncoder().encode(escapeData(message)))
    await client.assertResponse([250], "DATA")
    await client.command("QUIT", [221])
  } catch (error) {
    throw new Error("Failed to send the verification email. Please try again.", {
      cause: error,
    })
  } finally {
    client.close()
  }
}

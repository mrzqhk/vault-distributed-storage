/**
 * Parse multipart/form-data body buffer without external dependencies.
 * @param {Buffer} bodyBuffer 
 * @param {string} contentType 
 * @returns {{ fields: Record<string, string>, files: Record<string, { filename: string, mimeType: string, buffer: Buffer }> }}
 */
export function parseMultipart(bodyBuffer, contentType) {
  if (!bodyBuffer || !contentType) {
    return { fields: {}, files: {} };
  }

  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  if (!boundaryMatch) {
    return { fields: {}, files: {} };
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const boundaryDelimiter = Buffer.from(`--${boundary}`);
  
  const fields = {};
  const files = {};

  let startIndex = 0;

  while (startIndex < bodyBuffer.length) {
    const boundaryIndex = bodyBuffer.indexOf(boundaryDelimiter, startIndex);
    if (boundaryIndex === -1) break;

    // Check if it's the closing delimiter: --boundary--
    if (
      bodyBuffer[boundaryIndex + boundaryDelimiter.length] === 0x2D &&
      bodyBuffer[boundaryIndex + boundaryDelimiter.length + 1] === 0x2D
    ) {
      break;
    }

    const nextBoundaryIndex = bodyBuffer.indexOf(
      boundaryDelimiter,
      boundaryIndex + boundaryDelimiter.length
    );
    if (nextBoundaryIndex === -1) break;

    // Part starts after boundary delimiter and \r\n
    let partStart = boundaryIndex + boundaryDelimiter.length;
    if (bodyBuffer[partStart] === 0x0D && bodyBuffer[partStart + 1] === 0x0A) {
      partStart += 2;
    }

    // Part ends before next boundary delimiter and preceding \r\n
    let partEnd = nextBoundaryIndex;
    if (bodyBuffer[partEnd - 2] === 0x0D && bodyBuffer[partEnd - 1] === 0x0A) {
      partEnd -= 2;
    }

    const partBuffer = bodyBuffer.subarray(partStart, partEnd);

    // Header and body separator: \r\n\r\n (0x0D, 0x0A, 0x0D, 0x0A)
    const headerSep = Buffer.from('\r\n\r\n');
    const headerSepIndex = partBuffer.indexOf(headerSep);

    if (headerSepIndex !== -1) {
      const headerStr = partBuffer.subarray(0, headerSepIndex).toString('utf8');
      const body = partBuffer.subarray(headerSepIndex + 4);

      const dispMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
      if (dispMatch) {
        const fieldName = dispMatch[1];
        const filename = dispMatch[2];

        if (filename !== undefined) {
          const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
          files[fieldName] = {
            filename: filename || 'upload.bin',
            mimeType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
            buffer: body
          };
        } else {
          fields[fieldName] = body.toString('utf8').trim();
        }
      }
    }

    startIndex = nextBoundaryIndex;
  }

  return { fields, files };
}

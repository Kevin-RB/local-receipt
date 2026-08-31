FROM postgres:18-alpine

# MinIO client for mirroring the receipts bucket into the backups volume.
# The client binary is arch-specific: resolve it from the build platform, so
# the image builds correctly on arm64 (Colima on the M4 Mac mini) and amd64.
RUN apk add --no-cache curl \
  && case "$(uname -m)" in \
       x86_64 | amd64) ARCH=amd64 ;; \
       aarch64 | arm64) ARCH=arm64 ;; \
       *) echo "unsupported arch: $(uname -m)" >&2; exit 1 ;; \
     esac \
  && curl -fsSLo /usr/local/bin/mc "https://dl.min.io/client/mc/release/linux-$ARCH/mc" \
  && chmod +x /usr/local/bin/mc \
  && apk del curl

COPY backup.sh /usr/local/bin/backup
RUN chmod +x /usr/local/bin/backup

ENTRYPOINT ["/usr/local/bin/backup"]

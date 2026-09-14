FROM public.ecr.aws/docker/library/node:22-alpine

WORKDIR /app
COPY backup.mjs entrypoint.sh schema.sql ./
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

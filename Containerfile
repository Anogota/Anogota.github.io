FROM ruby:3.2-slim

ENV LANG=C.UTF-8 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_JOBS=4 \
    BUNDLE_RETRY=3 \
    JEKYLL_ENV=development

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    ca-certificates \
    libffi-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/jekyll

# Install gems first for better layer caching
COPY Gemfile jekyll-theme-console.gemspec ./
RUN bundle install

# Copy the rest of the source
COPY . /srv/jekyll

EXPOSE 4000 35729

CMD ["bash", "-lc", "bundle exec jekyll serve --host 0.0.0.0 --port 4000 --livereload"]

# jekyll-theme-console

A jekyll theme with inspiration from linux consoles for hackers, developers and script kiddies.

<img src="https://raw.githubusercontent.com/b2a3e8/jekyll-theme-console/master/screenrec-dark.gif" width="550" title="Screenshot">

## Demo

[dark style](https://b2a3e8.github.io/jekyll-theme-console-demo-dark/) ([source code](https://github.com/b2a3e8/jekyll-theme-console-demo-dark)):

[<img src="https://raw.githubusercontent.com/b2a3e8/jekyll-theme-console/master/screenshot-dark.png" width="350" title="Screenshot">](https://b2a3e8.github.io/jekyll-theme-console-demo-dark/)


[light style](https://b2a3e8.github.io/jekyll-theme-console-demo-light/) ([source code](https://github.com/b2a3e8/jekyll-theme-console-demo-light)):

[<img src="https://raw.githubusercontent.com/b2a3e8/jekyll-theme-console/master/screenshot-light.png" width="350" title="Screenshot">](https://b2a3e8.github.io/jekyll-theme-console-demo-light/)


[hacker style](https://b2a3e8.github.io/jekyll-theme-console-demo-hacker/) ([source code](https://github.com/b2a3e8/jekyll-theme-console-demo-hacker)):

[<img src="https://raw.githubusercontent.com/b2a3e8/jekyll-theme-console/master/screenshot-hacker.png" width="350" title="Screenshot">](https://b2a3e8.github.io/jekyll-theme-console-demo-hacker/)


## Installation

First, follow the steps in [this Quickstart Guide](https://jekyllrb.com/docs/) if you're starting with Jekyll from scratch. Skip this if you already have an existing jekyll project.

**_You can also use the [demo site's source code](https://b2a3e8.github.io/jekyll-theme-console-demo-dark/) as template for an easy start._**

### Remote theme method for GitHub Pages

Use this method for sites hosted with GitHub Pages only. To install:

1. Set `remote_theme` in your project's Jekyll `_config.yml` file:

   ```yaml
   remote_theme: b2a3e8/jekyll-theme-console
   ```

### Gem-based method

With Gem-based themes, directories such as the `assets`, `_layouts`, `_includes`, and `_sass` are stored in the theme’s gem, hidden from your immediate view. Yet all of the necessary directories will be read and processed during Jekyll’s build process.

This allows for easier installation and updating as you don't have to manage any of the theme files. To install:

1. Add this line to your Jekyll site's `Gemfile`:

   ```ruby
   gem "jekyll-theme-console"
   ```

2. Fetch and update bundled gems by running the following [Bundler](http://bundler.io/) command:

   ```bash
   bundle
   ```

3. Set `theme` in your project's Jekyll `_config.yml` file:

   ```yaml
   theme: jekyll-theme-console
   ```

To update the theme run `bundle update`.

## Usage

### _config.yml

In addition to jekyll's default configuration options, you can provide:
- `header_pages`: list of pages displayed in the navbar
- `footer`: HTML string inserted at the end of the page
- `google_analytics`: tracking id (only loaded in production when set)
- `listen_for_clients_preferred_style`: allow users to pick light/dark based on OS preference
- `style`: predefined color style (`dark` default, or `light`, `hacker`)
- `disable_google_fonts`: set `true` to avoid loading fonts from Google and use system fonts only

```yaml
header_pages:
  - index.md
  - about.md

style: dark # dark (default), light or hacker
listen_for_clients_preferred_style: true # false (default) or true

footer: 'follow us on <a href="https://twitter.com/xxx">twitter</a>'

google_analytics: UA-NNNNNNNN-N
disable_google_fonts: false
```

### front matter variables

Besides the predefined [front matter](https://jekyllrb.com/docs/front-matter/) variables from jekyll this theme also supports following variables:
- `title` to set a title for the page
- `lang` to specify the language, defaults to 'en'
- `robots` to control the robot meta tag ([details](http://longqian.me/2017/02/12/jekyll-robots-configuration/)) - this may be useful for example to set `NOINDEX` to tag pages

## Customization

If you want to customize this theme, follow this steps:
1. Fork this repository (you can use the fork as your own theme or directly as your website)
2. Create or modify files in `_layouts` directory for html-based changes
3. Create or modify files in `_sass` and `assets` for css-based changes
   - You can change things which are used in all styles (like font-size) in `_sass/base.scss`. You'll find style variables at the top.
   - Style-specific definitions are in `_sass/_dark.scss`, `_sass/_light.scss`, `_sass/_hacker.scss`.
   - Fonts are loaded via `<link>` tags for better performance. Set `disable_google_fonts: true` to avoid external font requests.

### Performance tips

- Enable Sass compression in your site by adding to `_config.yml`:

  ```yaml
  sass:
    style: compressed
  ```

- Consider adding `jekyll-feed` to your site's plugins for an RSS/Atom feed.

### Content Security Policy

This theme ships with a strict but practical CSP to improve security. By default it allows:
- self-hosted content plus images from `https:` and `data:` URIs
- Google Fonts (if not disabled)
- Google Analytics (only when `google_analytics` is set, including inline init script)

If you need additional sources (e.g., to embed iframes), extend the policy via `_config.yml`:

```yaml
csp_extra: "frame-src https:;"
```

Tip: To remove the top border line in the menu, override CSS in your site (e.g., add a small stylesheet) with:

```css
.menu { border-top: none; }
```

## Development

Your theme is setup just like a normal Jekyll site. You can run it either natively or in Docker.

### Run in Docker (recommended)


`docker compose up --build`

Then open `http://localhost:4000`.

### Run locally (without Docker)

1. `bundle install`
2. `bundle exec jekyll serve`
3. Open `http://localhost:4000`

When your theme is released, only the files in `_layouts`, `_includes`, `_sass` and `assets` tracked with Git will be bundled.
To add a custom directory to your theme-gem, please edit the regexp in `jekyll-theme-console.gemspec` accordingly.

## License

The theme is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

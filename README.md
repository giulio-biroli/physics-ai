# Physics in the Age of AI — website

Source of the seminar website, published with GitHub Pages. Every page is
generated from the plain-text files below; editing a file and committing it
updates the site within a minute or two.

## Adding content

| To add…              | Do this |
|----------------------|---------|
| A session            | Copy a file in `_events/`, name it `YYYY-MM-DD-short-title.md`, and edit the fields (title, theme = `perspectives`, `results` or `methods`, format, date, end, speaker, affiliation; `room` only if it is not Conf. IV). The text below the second `---` is the abstract. |
| Slides or a recording | Put the PDF in `assets/docs/` and add `slides: /assets/docs/<file>.pdf` and/or `video: <link>` to the session file. It then also appears under Resources. |
| A blog post          | Add `_posts/YYYY-MM-DD-short-title.md` with `title`, `author` and `excerpt`. Write equations as `$$...$$` and add `math: true`. |
| A document or link   | Add an entry to `_data/resources.yml`. |
| Organisers, venue, mailing list, contact | Edit `_data/organisers.yml` and `_config.yml`. |

Sessions move from “Upcoming” to “Past” automatically once they have taken place.

## Local preview

The site is built by GitHub Pages with Jekyll. To preview a change on your own
computer first (needs Ruby 3.3, e.g. `brew install ruby@3.3`):

    bundle install
    bundle exec jekyll serve

then open <http://localhost:4000/physics-ai/>.

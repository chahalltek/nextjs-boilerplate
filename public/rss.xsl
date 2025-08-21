<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <xsl:output method="html" encoding="UTF-8" />
  <xsl:template match="/">
    <html>
      <head>
        <meta charset="utf-8"/>
        <title><xsl:value-of select="rss/channel/title"/></title>
        <style>
          body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b0b0c;color:#eee;margin:2rem;}
          a{color:#ffd15c;text-decoration:none} a:hover{text-decoration:underline}
          .item{border:1px solid #333;border-radius:12px;padding:16px;margin:12px 0;background:#121214}
          .title{font-weight:700;font-size:1.1rem}
          .date{color:#aaa;font-size:.85rem;margin:.25rem 0 .75rem}
          .desc{color:#ddd}
        </style>
      </head>
      <body>
        <h1><xsl:value-of select="rss/channel/title"/></h1>
        <div>
          <xsl:for-each select="rss/channel/item">
            <div class="item">
              <div class="title">
                <a><xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
                  <xsl:value-of select="title"/>
                </a>
              </div>
              <div class="date"><xsl:value-of select="pubDate"/></div>
              <div class="desc">
                <xsl:choose>
                  <xsl:when test="content:encoded"><xsl:value-of select="content:encoded" disable-output-escaping="yes"/></xsl:when>
                  <xsl:otherwise><xsl:value-of select="description" disable-output-escaping="yes"/></xsl:otherwise>
                </xsl:choose>
              </div>
            </div>
          </xsl:for-each>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

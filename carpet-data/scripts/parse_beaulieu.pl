#!/usr/bin/perl
# raw/beaulieu/nf_*.html (Next.js pages; data sits in self.__next_f chunks) -> beaulieu.json
# Keeps needle-felt roll collections; skips tufted grass.
use strict; use warnings; use utf8;
use FindBin; use lib $FindBin::Bin; use Common;
use JSON::PP;

my $R=root(); my $B='https://www.beaulieu-needlefelt.com';
my $BS=chr(92);
sub rsc {
    my ($h)=@_; my $o='';
    while ($h =~ /self\.__next_f\.push\(\[1,"((?:[^"\x5c]|\x5c.)*)"\]\)/g) {
        my $c=$1;
        my $d=eval { JSON::PP->new->allow_nonref->decode(qq{"$c"}) };
        $o.= defined $d ? $d : '';
    }
    return $o;
}
sub unj { my ($s)=@_; return undef unless defined $s; my $d=eval { JSON::PP->new->allow_nonref->decode(qq{"$s"}) }; return defined $d?$d:$s }

my (@out,@skipped);
for my $f (sort glob("$R/raw/beaulieu/nf_*.html")) {
    (my $slug=$f) =~ s{.*/|\.html$}{}g;
    unless ($slug =~ /^nf_needlefelt_/) { push @skipped,"$slug: not needle felt"; next }
    my $h=slurp($f);
    my $d=rsc($h);
    my ($name)= $d =~ /"designName":"([^"]+)"/;
    ($name)= $h =~ m{<h1[^>]*>(.*?)</h1>}s unless $name;
    my ($meta)= $h =~ m{<meta name="description" content="([^"]*)"};
    my ($market)= $slug =~ /^nf_[a-z-]+?_([a-z]+)_/;

    my (@specs,%seen);
    if ($d =~ /"specificationGroups":\[(.*?)\],"(?!specifications)/s) {}
    my ($sg)= $d =~ /("specificationGroups":\[.{0,12000})/s;
    if ($sg) {
        while ($sg =~ /"groupTitle":"([^"]*)"|"type":"([^"]*)","label":"([^"]*)","value":("(?:[^"\x5c]|\x5c.)*"|null),"unit":("[^"]*"|null)/g) {
            next if defined $1;
            my ($l,$v,$u)=($3,$4,$5);
            next if $seen{$l}++;
            next if $v eq 'null';
            $v=unj(substr($v,1,-1)); $u=$u eq 'null'?'':' '.substr($u,1,-1);
            next if $l =~ /^(Labeled |Total weight class|Color name|Color number|Colour)/;
            push @specs,{label=>$l,value=>"$v$u"};
        }
    }
    my ($pdf)= $d =~ /"documentType":"Technical Datasheet","downloadLink":"([^"]+)"/;
    my %ri; my @images;
    while ($d =~ /"largeUrl":"([^"]+)"(?:(?!"largeUrl").){0,3000}?"assetTypesValue":\[\{"key":"en","value":"Roomshot"/sg) {
        push @images,$1 unless $ri{$1}++;
    }
    # One object per colour: "<Collection> - <code>" followed by its own image and specs.
    my %c; my @order;
    my @pos;
    while ($d =~ /"name":"([^"]+) - ([^"]+)","contentLinkId":(\d+)/g) { push @pos,[$-[0],$1,$2,$3] }
    for my $i (0..$#pos) {
        my ($p,$coll,$code,$id)=@{$pos[$i]};
        next if $c{$id};
        my $e=$i<$#pos ? $pos[$i+1][0] : length $d;
        my $seg=substr($d,$p,$e-$p);
        my ($img)= $seg =~ /"largeUrl":"([^"]+)"/;
        next unless $img;
        my ($cn)= $seg =~ /"label":"Color name","value":"([^"]*)"/;
        my ($url)= $seg =~ /"absoluteUrl":"([^"]+)"/;
        my ($w) = $seg =~ /"label":"Available widths","value":"([^"]*)"/;
        $c{$id}={code=>$code,name=>$cn,image=>$img,url=>$url//"$B/en/product-finder/collection/$slug"};
        push @order,$id;
    }
    my @colours=map { $c{$_} } @order;
    push @out,{brand=>'Beaulieu Needlefelt',collection=>clean($name),market=>$market,url=>"$B/en/product-finder/collection/$slug",
        description=>clean($meta),specs=>\@specs,datasheetPdf=>$pdf,images=>\@images,colours=>\@colours};
}
write_json("$R/beaulieu.json",\@out);
my $n=0; $n+=@{$_->{colours}} for @out;
printf "beaulieu: %d collections, %d colours\n",scalar(@out),$n;
printf "no colours: %s\n",join(', ',map {$_->{collection}} grep {!@{$_->{colours}}} @out);
printf "no specs: %s\n",join(', ',map {$_->{collection}} grep {!@{$_->{specs}}} @out);
print scalar(@skipped)," skipped (not needle felt)\n";
